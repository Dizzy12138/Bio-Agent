from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class KnowledgeBase(BaseModel):
    id: str
    name: str
    description: str
    type: Literal['literature', 'database', 'document', 'custom']
    source: str
    documentCount: int
    lastSyncAt: datetime
    status: Literal['active', 'syncing', 'error', 'offline']
    icon: Optional[str] = None
    metadata: Optional[dict] = None

class CategoryNode(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    children: List['CategoryNode'] = []
    count: Optional[int] = 0
    type: Literal['folder', 'category', 'tag']
    metadata: Optional[dict] = None

    class Config:
        # Needed for recursive definition
        from_attributes = True

class DocumentFeature(BaseModel):
    id: str
    type: str
    label: str
    value: str
    confidence: float
    source: str

class Document(BaseModel):
    id: str
    title: str
    abstract: Optional[str] = None
    authors: Optional[List[str]] = []
    source: str
    publishDate: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    keywords: Optional[List[str]] = []
    citations: Optional[int] = 0
    type: str
    knowledgeBaseId: str
    
    # UI props
    status: Optional[str] = 'indexed'
    fileType: Optional[str] = 'pdf'
    features: Optional[List[DocumentFeature]] = []
    
    createdAt: Optional[datetime] = datetime.now()

class SearchParams(BaseModel):
    query: str
    knowledgeBaseIds: Optional[List[str]] = None
    page: int = 1
    pageSize: int = 10

class SearchResult(BaseModel):
    documents: List[Document]
    total: int
    page: int
    pageSize: int
    hasMore: bool = False
