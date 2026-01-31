from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any
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
    # features can be list or complex nested object - use Any for flexibility
    features: Optional[Any] = None
    
    createdAt: Optional[datetime] = None

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


# =============================================
# Material Models - 生物材料数据模型
# =============================================

class MaterialProperty(BaseModel):
    """材料属性"""
    name: str
    value: str
    unit: Optional[str] = None
    testCondition: Optional[str] = None
    confidence: Optional[float] = None


class MaterialIdentity(BaseModel):
    """材料身份信息（来自 CSV features.materials.identity）"""
    abbreviation: Optional[str] = None
    architecture: Optional[str] = None  # e.g., nanoparticle, hydrogel, film
    material_type: Optional[str] = None  # e.g., polymer, carbohydrate, inorganic
    functional_role: Optional[str] = None  # e.g., carrier, matrix, modifier


class Material(BaseModel):
    """生物材料实体"""
    id: str
    name: str  # standardized_name
    category: str  # mapped from identity.material_type
    subcategory: Optional[str] = None  # mapped from identity.architecture
    abbreviation: Optional[str] = None
    
    # 材料属性
    properties: List[MaterialProperty] = []
    
    # 功能和应用
    functional_role: Optional[str] = None
    applications: List[str] = []  # extracted from assemblies.system_category
    
    # 来源追溯
    source_doc_ids: List[str] = []  # paper_ids that reference this material
    paper_count: int = 0
    
    # 元数据
    metadata: Optional[dict] = None
    
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)


class Assembly(BaseModel):
    """递送系统组装体"""
    id: str
    system_id: str  # e.g., "DOX@PLGA-PEG"
    system_category: str  # e.g., delivery, theranostic, sensing
    
    # 组分信息
    payload_name: Optional[str] = None
    material_name: Optional[str] = None
    loading_mode: Optional[str] = None  # e.g., encapsulation, covalent_conjugation
    
    # 功能性能
    release_kinetics: Optional[str] = None  # e.g., sustained, burst, gated
    functionality_notes: Optional[str] = None
    targeting: Optional[dict] = None  # active/passive targeting info
    stimulus_responsiveness: Optional[dict] = None  # triggers and response_type
    
    # 来源
    source_doc_id: str  # paper_id
    
    metadata: Optional[dict] = None
    createdAt: datetime = Field(default_factory=datetime.now)


class MaterialQueryParams(BaseModel):
    """材料查询参数"""
    query: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    functional_role: Optional[str] = None
    page: int = 1
    pageSize: int = 20
