from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

class Message(BaseModel):
    id: str
    role: str # 'user' | 'assistant' | 'system'
    content: str
    metadata: Optional[dict] = None
    createdAt: datetime = datetime.now()

class Conversation(BaseModel):
    id: str
    title: str
    expertId: Optional[str] = None
    messages: List[Message] = []
    createdAt: datetime = datetime.now()
    updatedAt: datetime = datetime.now()

class ChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    expertId: Optional[str] = None
