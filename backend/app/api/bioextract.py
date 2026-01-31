"""
BioExtract-AI API 路由
提供递送系统、微生物特征、论文标签等数据的 RESTful API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.services.bioextract_db import bioextract_service
from app.services.paper_api import paper_api_service
from app.models.bioextract import (
    DeliveryQueryParams,
    MicroFeatQueryParams,
    PaperTagQueryParams,
    PaginatedResponse,
    BioExtractStats,
    PaperMarkdownResponse,
)
import httpx

router = APIRouter(prefix="/bioextract")


# =============================================
# 统计信息
# =============================================

@router.get("/stats", response_model=BioExtractStats)
async def get_bioextract_stats():
    """
    获取 BioExtract 数据统计
    
    返回各数据集的记录数量
    """
    return await bioextract_service.get_stats()


# =============================================
# 递送系统 API
# =============================================

@router.get("/delivery-systems", response_model=PaginatedResponse)
async def get_delivery_systems(
    paper_id: Optional[str] = Query(None, description="按论文 ID 筛选"),
    carrier_type: Optional[str] = Query(None, description="按载体类型筛选"),
    system_name: Optional[str] = Query(None, description="按系统名称筛选"),
    keyword: Optional[str] = Query(None, description="全文关键词搜索"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
):
    """
    查询递送载体系统数据
    
    支持多种筛选条件和全文搜索
    """
    params = DeliveryQueryParams(
        paper_id=paper_id,
        carrier_type=carrier_type,
        system_name=system_name,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return await bioextract_service.query_delivery_systems(params)


@router.get("/delivery-systems/carrier-types")
async def get_delivery_carrier_types():
    """
    获取所有载体类型及其论文计数
    
    用于筛选器选项
    """
    types = await bioextract_service.get_delivery_carrier_types()
    return {"carrier_types": types}


@router.get("/delivery-systems/paper/{paper_id}")
async def get_delivery_by_paper(paper_id: str):
    """
    获取指定论文的所有递送系统
    """
    systems = await bioextract_service.get_delivery_by_paper_id(paper_id)
    return {"paper_id": paper_id, "systems": systems, "count": len(systems)}


# =============================================
# 微生物特征 API
# =============================================

@router.get("/micro-features", response_model=PaginatedResponse)
async def get_micro_features(
    paper_id: Optional[str] = Query(None, description="按论文 ID 筛选"),
    system_type: Optional[str] = Query(None, description="按系统类型筛选"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
):
    """
    查询微生物特征数据
    
    支持按论文、系统类型筛选和关键词搜索
    """
    params = MicroFeatQueryParams(
        paper_id=paper_id,
        system_type=system_type,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return await bioextract_service.query_micro_features(params)


@router.get("/micro-features/system-types")
async def get_micro_system_types():
    """
    获取所有微生物系统类型及其计数
    
    用于筛选器选项
    """
    types = await bioextract_service.get_micro_system_types()
    return {"system_types": types}


@router.get("/micro-features/paper/{paper_id}")
async def get_micro_by_paper(paper_id: str):
    """
    获取指定论文的所有微生物特征
    """
    features = await bioextract_service.get_micro_by_paper_id(paper_id)
    return {"paper_id": paper_id, "features": features, "count": len(features)}


# =============================================
# 论文标签 API
# =============================================

@router.get("/paper-tags", response_model=PaginatedResponse)
async def get_paper_tags(
    paper_id: Optional[str] = Query(None, description="按论文 ID 筛选"),
    classification: Optional[str] = Query(None, description="按分类筛选"),
    l1: Optional[str] = Query(None, description="按一级分类筛选"),
    l2: Optional[str] = Query(None, description="按二级分类筛选"),
    keyword: Optional[str] = Query(None, description="标题/摘要关键词搜索"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
):
    """
    查询论文标签数据
    
    支持按分类层级筛选和关键词搜索
    """
    params = PaperTagQueryParams(
        paper_id=paper_id,
        classification=classification,
        l1=l1,
        l2=l2,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return await bioextract_service.query_paper_tags(params)


@router.get("/paper-tags/classifications")
async def get_tag_classifications():
    """
    获取论文分类统计（按一级分类分组）
    
    用于筛选器和统计展示
    """
    classifications = await bioextract_service.get_tag_classifications()
    return {"classifications": classifications}


@router.get("/paper-tags/{paper_id}")
async def get_paper_tag_detail(paper_id: str):
    """
    获取指定论文的标签详情
    """
    tags = await bioextract_service.get_paper_tags(paper_id)
    if not tags:
        raise HTTPException(status_code=404, detail=f"Paper {paper_id} not found")
    return tags


@router.post("/paper-tags/search-by-tags")
async def search_papers_by_tags(
    tags: List[str],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    按标签搜索论文
    
    传入标签列表，返回匹配任意标签的论文
    """
    if not tags:
        raise HTTPException(status_code=400, detail="At least one tag is required")
    
    return await bioextract_service.search_papers_by_tags(
        tags=tags,
        page=page,
        page_size=page_size,
    )


# =============================================
# 论文 Markdown API (代理外部服务)
# =============================================

@router.get("/papers/{paper_id}/markdown", response_model=PaperMarkdownResponse)
async def get_paper_markdown(paper_id: str):
    """
    获取论文的 Markdown 内容
    
    代理外部论文服务 API，自动去除 base64 编码的图片
    
    - **paper_id**: 论文 ID
    
    返回处理后的 Markdown 内容，base64 图片会被替换为占位符
    """
    try:
        response = await paper_api_service.get_paper_markdown(paper_id)
        return response
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Paper {paper_id} not found in external service"
            )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"External API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch paper markdown: {str(e)}"
        )


@router.get("/papers/{paper_id}/pdf-url")
async def get_paper_pdf_url(paper_id: str):
    """
    获取论文 PDF 的下载 URL
    
    返回外部服务的 PDF 端点 URL
    """
    response = await paper_api_service.get_paper_pdf_url(paper_id)
    return response


@router.get("/papers/{paper_id}/exists")
async def check_paper_exists(paper_id: str):
    """
    检查论文是否存在于外部服务
    """
    exists = await paper_api_service.check_paper_exists(paper_id)
    return {"paper_id": paper_id, "exists": exists}


# =============================================
# ATPS 查询 (既有功能迁移)
# =============================================

@router.get("/atps/filter")
async def filter_atps(
    inner_phase: str = Query(..., description="内相聚合物名称")
):
    """
    按内相过滤 ATPS 记录
    
    这是从之前 bioextractAPI 迁移的接口
    """
    await bioextract_service.init_defaults()
    records = await bioextract_service.filter_atps(inner_phase)
    return {"records": [r.model_dump() for r in records], "count": len(records)}
