"""
分页工具函数
"""

from typing import TypeVar, Generic, List, Dict, Any
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorCollection

T = TypeVar('T')

class PaginationParams(BaseModel):
    """分页参数"""
    page: int = 1
    page_size: int = 20
    
    @property
    def skip(self) -> int:
        """计算跳过的记录数"""
        return (self.page - 1) * self.page_size
    
    def validate(self) -> None:
        """验证分页参数"""
        if self.page < 1:
            raise ValueError("page must be >= 1")
        if self.page_size < 1 or self.page_size > 100:
            raise ValueError("page_size must be between 1 and 100")


class PaginatedResult(BaseModel, Generic[T]):
    """分页结果"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
    
    @classmethod
    def create(cls, items: List[T], total: int, params: PaginationParams):
        """创建分页结果"""
        total_pages = (total + params.page_size - 1) // params.page_size
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
            has_next=params.page < total_pages,
            has_prev=params.page > 1
        )


async def paginate_mongo_query(
    collection: AsyncIOMotorCollection,
    query: Dict[str, Any],
    params: PaginationParams,
    sort: List[tuple] = None
) -> tuple[List[Dict], int]:
    """
    MongoDB 查询分页辅助函数
    
    Args:
        collection: MongoDB 集合
        query: 查询条件
        params: 分页参数
        sort: 排序条件，例如 [("created_at", -1)]
    
    Returns:
        (items, total) 元组
    """
    params.validate()
    
    # 获取总数
    total = await collection.count_documents(query)
    
    # 构建查询
    cursor = collection.find(query).skip(params.skip).limit(params.page_size)
    
    # 应用排序
    if sort:
        cursor = cursor.sort(sort)
    
    # 获取结果
    items = []
    async for doc in cursor:
        doc.pop("_id", None)  # 移除 MongoDB _id
        items.append(doc)
    
    return items, total

