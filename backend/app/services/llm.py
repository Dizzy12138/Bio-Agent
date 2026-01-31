from typing import AsyncGenerator, List, Dict, Any, Optional
import os
import httpx
import json
from app.core.config import settings

class LLMService:
    def __init__(self):
        # API Keys
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
        
        # Initialize Anthropic client if API key is available
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

    async def stream_chat(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completions from various LLM providers.
        Supports OpenAI (gpt-*) and Anthropic (claude-*) models.
        """
        
        # Determine provider based on model name
        if model.startswith("claude-"):
            async for chunk in self._stream_anthropic(messages, model, temperature):
                yield chunk
        elif model.startswith("gpt-") or model.startswith("o1-"):
            async for chunk in self._stream_openai(messages, model, temperature):
                yield chunk
        else:
            # Default to OpenAI-compatible
            async for chunk in self._stream_openai(messages, model, temperature):
                yield chunk
    
    async def _stream_openai(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float
    ) -> AsyncGenerator[str, None]:
        """Stream chat from OpenAI API"""
        
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True
        }

        # Handle Mock Mode if no key
        if not self.openai_api_key or self.openai_api_key == "mock":
            async for chunk in self._mock_stream(messages):
                yield chunk
            return

        if not self.client:
            self.client = httpx.AsyncClient(timeout=60.0)

        try:
            async with self.client.stream(
                "POST", 
                f"{self.openai_base_url}/chat/completions", 
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
        temperature: float
    ) -> AsyncGenerator[str, None]:
        """Stream chat from Anthropic Claude API"""
        
        # Handle Mock Mode if no key
        if not self.anthropic_api_key or self.anthropic_api_key == "mock":
            async for chunk in self._mock_stream(messages, provider="Anthropic Claude"):
                yield chunk
            return
        
        if not self.anthropic_client:
            yield "Error: Anthropic client not initialized. Please check your API key."
            return
        
        try:
            # Convert messages to Anthropic format
            # Anthropic requires system messages to be separate
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
            
            # Stream from Anthropic
            kwargs = {
                "model": model,
                "messages": anthropic_messages,
                "temperature": temperature,
                "max_tokens": 4096,
                "stream": True
            }
            
            if system_message:
                kwargs["system"] = system_message
            
            async with self.anthropic_client.messages.stream(**kwargs) as stream:
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
