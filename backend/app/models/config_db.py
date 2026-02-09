from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class LLMProvider(BaseModel):
    id: str
    name: str # e.g. "OpenAI", "Ollama"
    baseUrl: str
    apiKey: Optional[str] = None # In chunks/masked for FE, full for BE
    models: List[str] = [] # e.g. ["gpt-4", "gpt-3.5-turbo"]
    isEnabled: bool = True
    createdAt: datetime = datetime.now()

class AgentConfig(BaseModel):
    id: str
    name: str
    description: str
    avatar: Optional[str] = None
    systemPrompt: str
    modelProviderId: str # Link to LLMProvider
    model: str # e.g. "gpt-4"
    temperature: float = 0.7
    tools: List[str] = [] # List of enabled tool names/IDs
    createdAt: datetime = datetime.now()
    updatedAt: datetime = datetime.now()

class PromptTemplate(BaseModel):
    id: str
    key: str # unique slug, e.g. "ocr-correction"
    name: str
    content: str
    variables: List[str] = [] # e.g. ["{{text}}"]
    createdAt: datetime = datetime.now()

class MCPConfig(BaseModel):
    id: str
    name: str
    command: str
    args: List[str] = []
    env: Dict[str, str] = {}
    isEnabled: bool = False
    createdAt: datetime = datetime.now()

class SystemSettings(BaseModel):
    id: str = "system_settings"
    defaultProviderId: Optional[str] = None
    defaultModel: Optional[str] = None
    # 外部服务配置
    paperApiBaseUrl: Optional[str] = None
    paperApiToken: Optional[str] = None
    updatedAt: datetime = datetime.now()
