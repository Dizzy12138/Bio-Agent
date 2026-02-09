from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class Message(BaseModel):
    id: str
    role: str # 'user' | 'assistant' | 'system'
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    is_favorite: bool = False
    
    # 工具调用相关
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None

class Conversation(BaseModel):
    id: str
    user_id: str
    title: str
    expert_id: Optional[str] = None
    expert_name: Optional[str] = None
    expert_avatar: Optional[str] = None
    
    messages: List[Message] = []
    message_count: int = 0
    
    # 状态标记
    is_pinned: bool = False
    is_favorite: bool = False
    is_archived: bool = False
    
    # 标签
    tags: List[str] = []
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # LLM 模型配置（重命名避免与 Pydantic 保留字冲突）
    llm_config: Optional[Dict[str, Any]] = None

class ConversationCreate(BaseModel):
    title: Optional[str] = "新对话"
    expert_id: Optional[str] = None
    expert_name: Optional[str] = None
    expert_avatar: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    tags: Optional[List[str]] = None

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    expert_id: Optional[str] = None
    model: Optional[str] = "gpt-3.5-turbo"
    temperature: Optional[float] = 0.7
    stream: bool = True
