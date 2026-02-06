"""
对话记录数据模型（新架构）
按照需求文档设计的 conversations 和 messages 集合
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    """消息角色枚举"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageMetadata(BaseModel):
    """消息元数据"""
    tokens: Optional[int] = None
    latency: Optional[float] = None  # 响应延迟（秒）
    cost: Optional[float] = None  # 成本（美元）
    model: Optional[str] = None
    temperature: Optional[float] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class MessageDocument(BaseModel):
    """消息文档（messages 集合）"""
    id: str = Field(default_factory=lambda: f"msg-{datetime.now().timestamp()}")
    conversation_id: str  # 关联的会话 ID
    role: MessageRole
    content: str
    metadata: Optional[MessageMetadata] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        use_enum_values = True


class ConversationDocument(BaseModel):
    """会话文档（conversations 集合）"""
    id: str = Field(default_factory=lambda: f"conv-{datetime.now().timestamp()}")
    user_id: str  # 用户 ID（用于隔离）
    title: str = "新对话"
    model: Optional[str] = None  # 使用的 AI 模型（不设置默认值）
    
    # 关联信息
    expert_id: Optional[str] = None
    expert_name: Optional[str] = None
    
    # 统计信息
    message_count: int = 0
    
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 标记
    is_archived: bool = False
    is_favorite: bool = False
    tags: List[str] = []


# ==================== API 请求/响应模型 ====================

class MessageCreate(BaseModel):
    """创建消息请求"""
    conversation_id: str
    role: MessageRole
    content: str
    metadata: Optional[MessageMetadata] = None


class ConversationCreate(BaseModel):
    """创建会话请求"""
    title: Optional[str] = "新对话"
    model: Optional[str] = None  # 不设置默认值，由调用方提供
    expert_id: Optional[str] = None
    expert_name: Optional[str] = None


class ConversationUpdate(BaseModel):
    """更新会话请求"""
    title: Optional[str] = None
    is_archived: Optional[bool] = None
    is_favorite: Optional[bool] = None
    tags: Optional[List[str]] = None


class ConversationWithMessages(BaseModel):
    """会话及其消息（用于详情展示）"""
    conversation: ConversationDocument
    messages: List[MessageDocument]


class ConversationListResponse(BaseModel):
    """会话列表响应"""
    items: List[ConversationDocument]
    total: int
    page: int
    page_size: int
    has_more: bool


class ConversationQuery(BaseModel):
    """会话查询参数"""
    user_id: Optional[str] = None  # 管理员可以查询指定用户
    keyword: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_archived: Optional[bool] = None
    is_favorite: Optional[bool] = None
    page: int = 1
    page_size: int = 20
