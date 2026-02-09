"""
抽取演练场会话模型
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PlaygroundDocument(BaseModel):
    id: str
    name: str
    type: str  # 'image' | 'pdf' | 'text'
    url: str
    extracted_text: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=datetime.now)

class PlaygroundSchemaField(BaseModel):
    name: str
    type: str  # 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array'
    required: bool = False
    description: Optional[str] = None

class PlaygroundExtractedCell(BaseModel):
    value: Any
    confidence: float = 1.0
    bounding_box: Optional[List[float]] = None
    corrected: bool = False
    original_value: Optional[Any] = None

class PlaygroundExtractedRow(BaseModel):
    document_id: str
    values: Dict[str, PlaygroundExtractedCell]

class PlaygroundMessage(BaseModel):
    id: str
    role: str  # 'user' | 'agent' | 'system'
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    thinking_steps: Optional[List[Dict[str, Any]]] = None

class PlaygroundSession(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    
    # 文档
    documents: List[PlaygroundDocument] = []
    active_document_id: Optional[str] = None
    
    # Schema
    schema: List[PlaygroundSchemaField] = []
    schema_inferred: bool = False
    
    # 提取的数据
    extracted_rows: List[PlaygroundExtractedRow] = []
    
    # 对话历史
    messages: List[PlaygroundMessage] = []
    
    # LLM配置
    llm_config: Optional[Dict[str, Any]] = None
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_archived: bool = False
    tags: List[str] = []

class PlaygroundSessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None

class PlaygroundSessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    documents: Optional[List[PlaygroundDocument]] = None
    schema: Optional[List[PlaygroundSchemaField]] = None
    extracted_rows: Optional[List[PlaygroundExtractedRow]] = None
    messages: Optional[List[PlaygroundMessage]] = None
    llm_config: Optional[Dict[str, Any]] = None
    is_archived: Optional[bool] = None
    tags: Optional[List[str]] = None

