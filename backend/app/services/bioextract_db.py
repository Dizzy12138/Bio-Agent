"""
BioExtract 数据服务
提供递送系统、微生物特征、论文标签等数据的数据库操作
注意：根据实际数据库结构修复，使用 biomaterials 集合代替不存在的 delivery_systems 和 micro_features
"""

from app.db.mongo import mongodb
from app.models.bioextract import (
    DeliveryQwen,
    MicroFeat,
    PaperTagRecord,
    ATPSRecord,
    DeliveryQueryParams,
    MicroFeatQueryParams,
    PaperTagQueryParams,
    PaginatedResponse,
    BioExtractStats,
)
from typing import List, Optional, Dict, Any
from datetime import datetime


class BioExtractService:
    """BioExtract 数据服务类"""
    
    @property
    def delivery_collection(self):
        """递送系统集合 - 从 biomaterials 中筛选 category=delivery_system"""
        return mongodb.db["biomaterials"]
    
    @property
    def micro_collection(self):
        """微生物特征集合 - 从 biomaterials 中筛选 category=microbe"""
        return mongodb.db["biomaterials"]
    
    @property
    def paper_tags_collection(self):
        """论文标签集合"""
        return mongodb.db["paper_tags"]
    
    @property
    def atps_collection(self):
        """ATPS 记录集合 - 暂时返回空集合（数据不存在）"""
        return mongodb.db["atps_records"]
    
    async def init_defaults(self):
        """初始化默认数据（如果需要）"""
        pass
    
    # =============================================
    # 统计信息
    # =============================================
    
    async def get_stats(self) -> BioExtractStats:
        """获取 BioExtract 数据统计"""
        # 从 biomaterials 集合中按 category 筛选统计
        delivery_count = await mongodb.db["biomaterials"].count_documents({"category": "delivery_system"})
        micro_count = await mongodb.db["biomaterials"].count_documents({"category": "microbe"})
        tags_count = await self.paper_tags_collection.count_documents({})
        atps_count = await self.atps_collection.count_documents({})
        
        return BioExtractStats(
            delivery_systems_count=delivery_count,
            micro_features_count=micro_count,
            paper_tags_count=tags_count,
            atps_records_count=atps_count,
            last_updated=datetime.now()
        )
    
    # =============================================
    # 递送系统 API
    # =============================================
    
    async def query_delivery_systems(self, params: DeliveryQueryParams) -> PaginatedResponse:
        """查询递送系统 - 从 biomaterials 集合中筛选"""
        filter_query: Dict[str, Any] = {"category": "delivery_system"}
        
        # biomaterials 集合的实际字段：name, category, subcategory, paper_ids, paper_count, paper_titles
        if params.paper_id:
            filter_query["paper_ids"] = params.paper_id
        if params.carrier_type:
            # carrier_type 映射到 subcategory
            filter_query["subcategory"] = {"$regex": params.carrier_type, "$options": "i"}
        if params.system_name:
            # system_name 映射到 name
            filter_query["name"] = {"$regex": params.system_name, "$options": "i"}
        if params.keyword:
            filter_query["$or"] = [
                {"name": {"$regex": params.keyword, "$options": "i"}},
                {"subcategory": {"$regex": params.keyword, "$options": "i"}},
                {"paper_titles": {"$regex": params.keyword, "$options": "i"}},
            ]
        
        total = await self.delivery_collection.count_documents(filter_query)
        skip = (params.page - 1) * params.page_size
        
        cursor = self.delivery_collection.find(filter_query).skip(skip).limit(params.page_size)
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            # 转换字段名以匹配前端期望
            item = {
                "name": doc.get("name", ""),
                "category": doc.get("category", ""),
                "subcategory": doc.get("subcategory", ""),
                "carrier_type": doc.get("subcategory", ""),  # 映射
                "system_name": doc.get("name", ""),  # 映射
                "paper_ids": doc.get("paper_ids", []),
                "paper_count": doc.get("paper_count", 0),
                "paper_titles": doc.get("paper_titles", []),
            }
            items.append(item)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            has_more=(skip + params.page_size) < total
        )
    
    async def get_delivery_carrier_types(self) -> List[Dict[str, Any]]:
        """获取所有载体类型及其计数 - 从 biomaterials 的 subcategory 字段获取"""
        pipeline = [
            {"$match": {"category": "delivery_system"}},
            {"$group": {"_id": "$subcategory", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        types = []
        async for doc in mongodb.db["biomaterials"].aggregate(pipeline):
            if doc["_id"]:
                types.append({"type": doc["_id"], "count": doc["count"]})
        return types
    
    async def get_delivery_by_paper_id(self, paper_id: str) -> List[Dict]:
        """获取指定论文的所有递送系统 - 从 biomaterials 中查找包含该 paper_id 的记录"""
        cursor = mongodb.db["biomaterials"].find({
            "category": "delivery_system",
            "paper_ids": paper_id
        })
        systems = []
        async for doc in cursor:
            doc.pop("_id", None)
            systems.append({
                "name": doc.get("name", ""),
                "category": doc.get("category", ""),
                "subcategory": doc.get("subcategory", ""),
                "carrier_type": doc.get("subcategory", ""),
                "system_name": doc.get("name", ""),
                "paper_ids": doc.get("paper_ids", []),
                "paper_count": doc.get("paper_count", 0),
            })
        return systems
    
    # =============================================
    # 微生物特征 API
    # =============================================
    
    async def query_micro_features(self, params: MicroFeatQueryParams) -> PaginatedResponse:
        """查询微生物特征 - 从 biomaterials 集合中筛选"""
        filter_query: Dict[str, Any] = {"category": "microbe"}
        
        # biomaterials 集合的实际字段：name, category, subcategory, paper_ids, paper_count, paper_titles
        if params.paper_id:
            filter_query["paper_ids"] = params.paper_id
        if params.system_type:
            # system_type 映射到 subcategory
            filter_query["subcategory"] = {"$regex": params.system_type, "$options": "i"}
        if params.keyword:
            filter_query["$or"] = [
                {"name": {"$regex": params.keyword, "$options": "i"}},
                {"subcategory": {"$regex": params.keyword, "$options": "i"}},
                {"paper_titles": {"$regex": params.keyword, "$options": "i"}},
            ]
        
        total = await self.micro_collection.count_documents(filter_query)
        skip = (params.page - 1) * params.page_size
        
        cursor = self.micro_collection.find(filter_query).skip(skip).limit(params.page_size)
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            # 转换字段名以匹配前端期望
            item = {
                "name": doc.get("name", ""),
                "category": doc.get("category", ""),
                "subcategory": doc.get("subcategory", ""),
                "system_type": doc.get("subcategory", ""),  # 映射
                "paper_ids": doc.get("paper_ids", []),
                "paper_count": doc.get("paper_count", 0),
                "paper_titles": doc.get("paper_titles", []),
            }
            items.append(item)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            has_more=(skip + params.page_size) < total
        )
    
    async def get_micro_system_types(self) -> List[Dict[str, Any]]:
        """获取所有微生物系统类型及其计数 - 从 biomaterials 的 subcategory 字段获取"""
        pipeline = [
            {"$match": {"category": "microbe"}},
            {"$group": {"_id": "$subcategory", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        types = []
        async for doc in mongodb.db["biomaterials"].aggregate(pipeline):
            if doc["_id"]:
                types.append({"type": doc["_id"], "count": doc["count"]})
        return types
    
    async def get_micro_by_paper_id(self, paper_id: str) -> List[Dict]:
        """获取指定论文的所有微生物特征 - 从 biomaterials 中查找包含该 paper_id 的记录"""
        cursor = mongodb.db["biomaterials"].find({
            "category": "microbe",
            "paper_ids": paper_id
        })
        features = []
        async for doc in cursor:
            doc.pop("_id", None)
            features.append({
                "name": doc.get("name", ""),
                "category": doc.get("category", ""),
                "subcategory": doc.get("subcategory", ""),
                "system_type": doc.get("subcategory", ""),
                "paper_ids": doc.get("paper_ids", []),
                "paper_count": doc.get("paper_count", 0),
            })
        return features
    
    # =============================================
    # 论文标签 API
    # =============================================
    
    async def query_paper_tags(self, params: PaperTagQueryParams) -> PaginatedResponse:
        """查询论文标签"""
        filter_query: Dict[str, Any] = {}
        
        # paper_tags 集合的实际字段：paper_id, title, authors, journal, year
        # 注意：实际数据库中没有 classification, l1, l2, abstract 字段
        if params.paper_id:
            filter_query["paper_id"] = params.paper_id
        # classification, l1, l2 字段在实际数据库中不存在，跳过这些筛选
        # if params.classification:
        #     filter_query["classification"] = params.classification
        # if params.l1:
        #     filter_query["l1"] = params.l1
        # if params.l2:
        #     filter_query["l2"] = params.l2
        if params.keyword:
            # 只搜索存在的字段：title, authors, journal
            filter_query["$or"] = [
                {"title": {"$regex": params.keyword, "$options": "i"}},
                {"authors": {"$regex": params.keyword, "$options": "i"}},
                {"journal": {"$regex": params.keyword, "$options": "i"}},
            ]
        
        total = await self.paper_tags_collection.count_documents(filter_query)
        skip = (params.page - 1) * params.page_size
        
        cursor = self.paper_tags_collection.find(filter_query).skip(skip).limit(params.page_size)
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            items.append(doc)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            has_more=(skip + params.page_size) < total
        )
    
    async def get_tag_classifications(self) -> List[Dict[str, Any]]:
        """获取论文分类统计 - 按期刊分组（因为 l1 字段不存在）"""
        pipeline = [
            {"$group": {"_id": "$journal", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}  # 限制返回前20个期刊
        ]
        classifications = []
        async for doc in self.paper_tags_collection.aggregate(pipeline):
            if doc["_id"]:
                classifications.append({"classification": doc["_id"], "count": doc["count"]})
        return classifications
    
    async def get_paper_tags(self, paper_id: str) -> Optional[Dict]:
        """获取指定论文的标签详情"""
        doc = await self.paper_tags_collection.find_one({"paper_id": paper_id})
        if doc:
            doc.pop("_id", None)
            return doc
        return None
    
    async def search_papers_by_tags(
        self, 
        tags: List[str], 
        page: int = 1, 
        page_size: int = 20
    ) -> PaginatedResponse:
        """按标签搜索论文 - 由于 l1/l2/l3 字段不存在，改为按期刊搜索"""
        filter_query = {
            "$or": [
                {"journal": {"$in": tags}},
                {"title": {"$regex": "|".join(tags), "$options": "i"}},
            ]
        }
        
        total = await self.paper_tags_collection.count_documents(filter_query)
        skip = (page - 1) * page_size
        
        cursor = self.paper_tags_collection.find(filter_query).skip(skip).limit(page_size)
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            items.append(doc)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=(skip + page_size) < total
        )
    
    # =============================================
    # ATPS 查询
    # =============================================
    
    async def filter_atps(self, inner_phase: str) -> List[ATPSRecord]:
        """按内相过滤 ATPS 记录 - atps_records 集合不存在，返回空列表"""
        # atps_records 集合在当前数据库中不存在
        # 如果需要此功能，需要先导入 ATPS 数据
        return []


# 创建全局服务实例
bioextract_service = BioExtractService()
