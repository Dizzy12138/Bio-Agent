from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.knowledge import KnowledgeBase, Document, SearchParams, SearchResult, CategoryNode, Material
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
    """
    搜索文献，支持按关键词和知识库筛选
    """
    result = await knowledge_service.search_documents(
        query=params.query,
        knowledge_base_ids=params.knowledgeBaseIds,
        page=params.page,
        page_size=params.pageSize
    )
    return result


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """获取单个文献详情"""
    doc = await knowledge_service.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/documents-categories")
async def get_document_categories():
    """
    获取文献按期刊来源分类的统计
    用于左侧分类树
    """
    return await knowledge_service.get_document_categories()


@router.get("/documents-stats")
async def get_document_stats():
    """获取文献库统计信息"""
    return await knowledge_service.get_document_stats()


@router.get("/stats")
async def get_knowledge_stats():
    """
    获取知识库综合统计信息
    包含文献和材料的总数统计
    """
    doc_stats = await knowledge_service.get_document_stats()
    mat_stats = await knowledge_service.get_materials_stats()
    
    return {
        "totalDocuments": doc_stats.get("total", 0),
        "totalMaterials": mat_stats.get("total", 0),
        "categories": mat_stats.get("categories", []),
        "documentStats": doc_stats,
        "materialStats": mat_stats,
    }


# =============================================
# Materials API - 生物材料数据接口
# =============================================

@router.get("/materials")
async def get_materials(
    query: Optional[str] = Query(None, description="搜索关键词（名称或论文标题）"),
    category: Optional[str] = Query(None, description="材料大类：delivery_system 或 microbe"),
    subcategory: Optional[str] = Query(None, description="子分类：delivery, theranostic, bacterium 等"),
    hasPaper: Optional[bool] = Query(None, description="是否关联文献"),
    sortBy: str = Query("paper_count", description="排序字段：name, category, subcategory, paper_title, paper_count"),
    sortOrder: str = Query("desc", description="排序方向：asc 或 desc"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量")
):
    """
    获取材料列表，支持搜索、筛选和排序
    
    - **query**: 按名称或论文标题搜索
    - **category**: 按大类筛选 (delivery_system, microbe)
    - **subcategory**: 按子分类筛选 (delivery, theranostic, bacterium 等)
    - **hasPaper**: 筛选是否关联文献
    - **sortBy**: 排序字段
    - **sortOrder**: 排序方向 (asc/desc)
    """
    result = await knowledge_service.get_materials(
        query=query,
        category=category,
        subcategory=subcategory,
        has_paper=hasPaper,
        sort_by=sortBy,
        sort_order=sortOrder,
        page=page,
        page_size=pageSize
    )
    return result


@router.get("/materials/categories")
async def get_material_categories():
    """
    获取所有材料分类及其计数
    """
    categories = await knowledge_service.get_material_categories()
    return {"categories": categories}


@router.get("/materials/stats")
async def get_materials_stats():
    """
    获取材料库统计信息
    """
    stats = await knowledge_service.get_materials_stats()
    return stats


@router.get("/materials/{material_id}")
async def get_material_by_id(material_id: str):
    """
    获取单个材料详情
    """
    material = await knowledge_service.get_material_by_id(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


# =============================================
# Biomaterials API - 新建的统一材料接口
# =============================================

@router.get("/biomaterials")
async def get_biomaterials(
    category: Optional[str] = Query(None, description="分类: delivery_system 或 microbe"),
    subcategory: Optional[str] = Query(None, description="子分类"),
    query: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100)
):
    """
    获取生物材料列表，支持按分类筛选
    """
    db = mongodb.db
    collection = db["biomaterials"]
    
    # 构建查询条件
    filter_query = {}
    if category:
        filter_query["category"] = category
    if subcategory:
        filter_query["subcategory"] = subcategory
    if query:
        filter_query["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"paper_title": {"$regex": query, "$options": "i"}},
        ]
    
    # 分页
    skip = (page - 1) * pageSize
    total = await collection.count_documents(filter_query)
    cursor = collection.find(filter_query).skip(skip).limit(pageSize)
    items = await cursor.to_list(length=pageSize)
    
    # 转换 ObjectId
    for item in items:
        item["_id"] = str(item["_id"])
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "hasMore": (skip + len(items)) < total,
    }


@router.get("/biomaterials/categories")
async def get_biomaterials_categories():
    """
    获取材料分类统计 (用于侧边栏)
    """
    db = mongodb.db
    collection = db["biomaterials"]
    
    # 聚合按 category 和 subcategory 分组
    pipeline = [
        {"$group": {
            "_id": {"category": "$category", "subcategory": "$subcategory"},
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": "$_id.category",
            "subcategories": {
                "$push": {
                    "name": "$_id.subcategory",
                    "count": "$count"
                }
            },
            "total": {"$sum": "$count"}
        }},
        {"$project": {
            "category": "$_id",
            "subcategories": 1,
            "total": 1,
            "_id": 0
        }}
    ]
    
    result = await collection.aggregate(pipeline).to_list(length=100)
    return {"categories": result}


@router.get("/biomaterials/stats")
async def get_biomaterials_stats():
    """
    获取材料库统计信息
    """
    db = mongodb.db
    collection = db["biomaterials"]
    
    total = await collection.count_documents({})
    delivery_count = await collection.count_documents({"category": "delivery_system"})
    microbe_count = await collection.count_documents({"category": "microbe"})
    
    return {
        "total": total,
        "delivery_systems": delivery_count,
        "microbes": microbe_count,
    }


@router.get("/biomaterials/{material_id}")
async def get_biomaterial_detail(material_id: str):
    """
    获取单个材料详情
    """
    db = mongodb.db
    collection = db["biomaterials"]
    
    material = await collection.find_one({"id": material_id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material["_id"] = str(material["_id"])
    return material


# =============================================
# Documents API - 新建的文献接口
# =============================================

@router.get("/papers")
async def get_papers(
    source: Optional[str] = Query(None, description="来源表: delivery 或 microbe"),
    query: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100)
):
    """
    获取文献列表
    """
    db = mongodb.db
    collection = db["documents"]
    
    filter_query = {}
    if source:
        filter_query["source_tables"] = source
    if query:
        filter_query["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"authors": {"$regex": query, "$options": "i"}},
        ]
    
    skip = (page - 1) * pageSize
    total = await collection.count_documents(filter_query)
    cursor = collection.find(filter_query).skip(skip).limit(pageSize)
    items = await cursor.to_list(length=pageSize)
    
    for item in items:
        item["_id"] = str(item["_id"])
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "hasMore": (skip + len(items)) < total,
    }


@router.get("/papers/stats")
async def get_papers_stats():
    """
    获取文献库统计信息
    """
    db = mongodb.db
    collection = db["documents"]
    
    total = await collection.count_documents({})
    with_markdown = await collection.count_documents({"has_markdown": True})
    
    return {
        "total": total,
        "withMarkdown": with_markdown,
    }


@router.get("/papers/{paper_id}")
async def get_paper_detail(paper_id: str):
    """
    获取单篇文献详情
    """
    db = mongodb.db
    collection = db["documents"]
    
    paper = await collection.find_one({"paper_id": paper_id})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    paper["_id"] = str(paper["_id"])
    return paper
