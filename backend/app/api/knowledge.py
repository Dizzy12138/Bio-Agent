from fastapi import APIRouter, HTTPException
from typing import List
from app.models.knowledge import KnowledgeBase, Document, SearchParams, SearchResult, CategoryNode
from app.db.mongo import mongodb

router = APIRouter()

from app.services.knowledge_db import knowledge_service

# Initialize defaults on module load (or better, in startup event)
# For simplicity, we lazy load or rely on service

@router.get("/knowledge-bases", response_model=List[KnowledgeBase])
async def get_knowledge_bases():
    # Ensure defaults exist (lightweight check, optimization: move to startup)
    await knowledge_service.init_defaults()
    return await knowledge_service.get_all()

@router.get("/categories", response_model=List[CategoryNode])
async def get_categories():
    """
    Get generic categories tree (mapped from knowledge bases)
    """
    await knowledge_service.init_defaults()
    kbs = await knowledge_service.get_all()
    
    # Map KnowledgeBase to CategoryNode structure (Flat list as root nodes)
    # Note: Using dict to match response structure implicitly or use CategoryNode model if imported
    # Frontend expects: CategoryNode[]
    # We will return the list but need to ensure it matches the schema or relax response_model
    
    nodes = []
    for kb in kbs:
        nodes.append({
            "id": kb.id,
            "name": kb.name,
            "icon": kb.icon,
            "children": [],
            "count": kb.documentCount,
            "type": "category",
            "metadata": {"source": kb.source, "type": kb.type}
        })
    return nodes


@router.get("/knowledge-bases/{kb_id}", response_model=KnowledgeBase)
async def get_knowledge_base(kb_id: str):
    kb = await knowledge_service.get_by_id(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb

@router.post("/documents/search", response_model=SearchResult)
async def search_documents(params: SearchParams):
    # TODO: Implement vector search via PostgreSQL / Neo4j
    return {
        "documents": [],
        "total": 0,
        "page": params.page,
        "pageSize": params.pageSize,
        "hasMore": False
    }
