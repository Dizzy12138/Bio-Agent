from typing import AsyncGenerator, List, Dict, Any, Optional
import os
import httpx
import json
from app.core.config import settings

class LLMService:
    def __init__(self):
        # Default to OpenAI-compatible interface
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1" # Can be overridden by env
        self.client: Optional[httpx.AsyncClient] = None
    
    async def start(self):
        """Initialize the HTTP client"""
        if not self.client:
            self.client = httpx.AsyncClient(timeout=60.0)
            print("LLMService HTTP client initialized.")

    async def stop(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None
            print("LLMService HTTP client closed.")

    async def stream_chat(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True
        }

        # Handle Mock Mode if no key
        if not self.api_key or self.api_key == "mock":
            async for chunk in self._mock_stream(messages):
                yield chunk
            return

        if not self.client:
            # Fallback if start() wasn't called, though it should be in main.py
            self.client = httpx.AsyncClient(timeout=60.0)

        try:
            async with self.client.stream(
                "POST", 
                f"{self.base_url}/chat/completions", 
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

    async def _mock_stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        import asyncio
        last_msg = messages[-1]['content']
        response = f"【Mock LLM】我收到了你的消息：'{last_msg}'。由于未配置 OPENAI_API_KEY，这是模拟响应。\n\n你可以配置环境来连接真实模型。"
        
        for char in response:
            await asyncio.sleep(0.05)
            yield char

llm_service = LLMService()
