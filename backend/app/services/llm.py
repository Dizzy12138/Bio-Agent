from typing import AsyncGenerator, List, Dict, Any, Optional
import os
import httpx
import json
from app.core.config import settings


class LLMService:
    def __init__(self):
        # API Keys (fallback from env vars)
        self.openai_api_key = settings.OPENAI_API_KEY
        self.anthropic_api_key = settings.ANTHROPIC_API_KEY
        self.openai_base_url = "https://api.openai.com/v1"
        self.anthropic_base_url = "https://api.anthropic.com/v1"

        self.client: Optional[httpx.AsyncClient] = None
        self.anthropic_client = None

    async def start(self):
        """Initialize the HTTP client and Anthropic SDK"""
        if not self.client:
            self.client = httpx.AsyncClient(timeout=60.0)
            print("LLMService HTTP client initialized.")

        # Initialize Anthropic client if API key is available (env fallback)
        if self.anthropic_api_key and self.anthropic_api_key != "mock":
            try:
                from anthropic import AsyncAnthropic
                self.anthropic_client = AsyncAnthropic(api_key=self.anthropic_api_key)
                print("Anthropic client initialized.")
            except ImportError:
                print("Warning: anthropic package not installed. Run: pip install anthropic")
            except Exception as e:
                print(f"Warning: Failed to initialize Anthropic client: {e}")

    async def stop(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None
            print("LLMService HTTP client closed.")

        self.anthropic_client = None

    async def _resolve_provider(self, model: str) -> Dict[str, Any]:
        """Resolve provider config for a given model.

        Priority:
        1. DB-stored provider that contains the model
        2. Env-var fallback based on model name prefix
        """
        try:
            from app.services.config_db import config_service

            # Try to find a DB provider for this model
            provider_cfg = await config_service.find_provider_for_model(model)
            if provider_cfg and provider_cfg.get("api_key"):
                return provider_cfg

            # If no specific provider found for this model, try default settings
            default_cfg = await config_service.get_default_provider_config()
            if default_cfg and default_cfg.get("api_key"):
                # Use default provider but keep the requested model
                default_cfg["model"] = model
                return default_cfg
        except Exception as e:
            print(f"⚠️  DB provider lookup failed, falling back to env vars: {e}")

        # Fallback: determine provider from model name prefix + env vars
        if model.startswith("claude-"):
            return {
                "api_key": self.anthropic_api_key,
                "base_url": self.anthropic_base_url,
                "provider_name": "Anthropic (env)",
                "model": model,
            }
        else:
            return {
                "api_key": self.openai_api_key,
                "base_url": self.openai_base_url,
                "provider_name": "OpenAI (env)",
                "model": model,
            }

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completions from various LLM providers.
        Supports OpenAI-compatible, Anthropic, and any third-party provider via DB config.
        """

        # Resolve which provider to use
        provider_cfg = await self._resolve_provider(model)
        api_key = provider_cfg.get("api_key")
        base_url = provider_cfg.get("base_url", "")
        provider_name = provider_cfg.get("provider_name", "")

        # Determine routing: Anthropic-style or OpenAI-compatible
        is_anthropic = (
            "anthropic" in (provider_name or "").lower()
            or "anthropic" in (base_url or "").lower()
            or model.startswith("claude-")
        )

        if is_anthropic:
            async for chunk in self._stream_anthropic(
                messages, model, temperature, max_tokens,
                api_key=api_key, base_url=base_url
            ):
                yield chunk
        else:
            async for chunk in self._stream_openai(
                messages, model, temperature, max_tokens,
                api_key=api_key, base_url=base_url
            ):
                yield chunk

    async def _stream_openai(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat from OpenAI-compatible API (supports any third-party API)"""

        effective_key = api_key or self.openai_api_key
        effective_url = base_url or self.openai_base_url

        headers = {
            "Authorization": f"Bearer {effective_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        # Handle Mock Mode if no key
        if not effective_key or effective_key == "mock":
            async for chunk in self._mock_stream(messages):
                yield chunk
            return

        if not self.client:
            self.client = httpx.AsyncClient(timeout=60.0)

        try:
            # Ensure base_url ends without trailing slash
            url = effective_url.rstrip("/")
            if not url.endswith("/chat/completions"):
                url = f"{url}/chat/completions"

            async with self.client.stream(
                "POST",
                url,
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield f"Error: {response.status_code} - {error_text.decode()}"
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            content = json.loads(data)
                            delta = content["choices"][0]["delta"]
                            if "content" in delta:
                                yield delta["content"]
                        except:
                            pass
        except Exception as e:
            yield f"Error: Request failed - {str(e)}"

    async def _stream_anthropic(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat from Anthropic Claude API
        支持1024k上下文长度的模型，使用更大的max_tokens
        """

        effective_key = api_key or self.anthropic_api_key

        # Handle Mock Mode if no key
        if not effective_key or effective_key == "mock":
            async for chunk in self._mock_stream(messages, provider="Anthropic Claude"):
                yield chunk
            return

        # Create or reuse Anthropic client
        anthropic_client = self.anthropic_client
        if effective_key != self.anthropic_api_key or not anthropic_client:
            try:
                from anthropic import AsyncAnthropic
                kwargs = {"api_key": effective_key}
                if base_url:
                    kwargs["base_url"] = base_url
                anthropic_client = AsyncAnthropic(**kwargs)
            except ImportError:
                yield "Error: anthropic package not installed. Run: pip install anthropic"
                return
            except Exception as e:
                yield f"Error: Failed to create Anthropic client: {e}"
                return

        if not anthropic_client:
            yield "Error: Anthropic client not initialized. Please check your API key."
            return

        try:
            # Convert messages to Anthropic format
            system_message = None
            anthropic_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    anthropic_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            kwargs = {
                "model": model,
                "messages": anthropic_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True
            }

            if system_message:
                kwargs["system"] = system_message

            async with anthropic_client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text

        except Exception as e:
            yield f"Error: Anthropic request failed - {str(e)}"

    async def _mock_stream(self, messages: List[Dict[str, str]], provider: str = "Mock LLM") -> AsyncGenerator[str, None]:
        import asyncio
        last_msg = messages[-1]['content']
        response = f"【{provider}】我收到了你的消息：'{last_msg}'。由于未配置 API KEY，这是模拟响应。\n\n你可以配置环境来连接真实模型。"

        for char in response:
            await asyncio.sleep(0.05)
            yield char

llm_service = LLMService()
