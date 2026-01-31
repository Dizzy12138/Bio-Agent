"""
BioExtract-AI 数据库服务
提供递送系统、微生物特征、论文标签等数据的查询接口
"""

from app.db.mongo import mongodb
from app.models.bioextract import (
    ATPSRecord,
    DeliveryQwen,
    MicroFeat,
    PaperTagRecord,
    DeliveryQueryParams,
    MicroFeatQueryParams,
    PaperTagQueryParams,
    PaginatedResponse,
    BioExtractStats,
)
from typing import List, Optional, Dict, Any
from datetime import datetime

# Mock ATPS Data (Seeds)
SEED_ATPS_RECORDS = [
    {
        "id": "atps-001",
        "polymer1": "PEG",
        "polymer2": "Dextran",
        "polymer1MW": 6000,
        "polymer2MW": 500000,
        "polymer1Conc": 4.5,
        "polymer2Conc": 7.0,
        "temperature": 25,
        "pH": 7.0,
        "phaseFormation": True,
        "topPhase": "PEG",
        "bottomPhase": "Dextran",
        "reference": "Albertsson, 1986",
        "partitionCoefficient": 3.2
    },
    {
        "id": "atps-002",
        "polymer1": "PEG",
        "polymer2": "Phosphate",
        "polymer1MW": 4000,
        "polymer2MW": 0,  # Salt
        "polymer1Conc": 12.5,
        "polymer2Conc": 10.0,
        "temperature": 20,
        "pH": 7.5,
        "phaseFormation": True,
        "topPhase": "PEG",
        "bottomPhase": "Salt",
        "reference": "Zaslavsky, 1995",
        "partitionCoefficient": 5.8
    }
]


class BioExtractService:
    """BioExtract-AI 数据服务"""
    
    # =============================================
    # 集合属性
    # =============================================
    
    @property
    def atps_collection(self):
        """ATPS 记录集合"""
        return mongodb.db["atps_records"]
    
    @property
    def delivery_collection(self):
        """递送系统集合（biomaterials 中 category=delivery_system）"""
        return mongodb.db["biomaterials"]

    @property
    def micro_collection(self):
        """微生物特征集合（biomaterials 中 category=microbe）"""
        return mongodb.db["biomaterials"]
    
    @property
    def documents_collection(self):
        """文献集合"""
        return mongodb.db["documents"]
    
    @property
    def tags_collection(self):
        """论文标签集合"""
        return mongodb.db["paper_tags"]
    
    # 兼容旧属性名
    @property
    def collection(self):
        return self.atps_collection
    
    # =============================================
    # 初始化
    # =============================================
    
    async def init_defaults(self):
        """初始化默认数据（如果集合为空）"""
        if await self.atps_collection.count_documents({}) == 0:
            for r in SEED_ATPS_RECORDS:
                await self.atps_collection.insert_one(r)
    
    # =============================================
    # ATPS 查询 (既有功能)
    # =============================================
    
    async def filter_atps(self, inner_phase: str) -> List[ATPSRecord]:
        """按内相过滤 ATPS 记录"""
        regex = {"$regex": f"^{inner_phase}$", "$options": "i"}
        query = {
            "$or": [
                {"polymer1": regex},
                {"polymer2": regex}
            ]
        }
        
        cursor = self.atps_collection.find(query)
        records = []
        async for doc in cursor:
            records.append(ATPSRecord(**doc))
        return records
    
    # =============================================
    # 递送系统查询 (新增)
    # =============================================
    
    async def query_delivery_systems(
        self,
        params: DeliveryQueryParams
    ) -> PaginatedResponse:
        """
        查询递送系统数据（biomaterials 集合，category=delivery_system）。
        关键词搜索：name, subcategory, paper_titles, functional_performance, raw_data。
        """
        query: Dict[str, Any] = {"category": "delivery_system"}
        if params.paper_id:
            query["paper_ids"] = params.paper_id
        if params.carrier_type:
            query["subcategory"] = {"$regex": params.carrier_type, "$options": "i"}
        if params.system_name:
            query["name"] = {"$regex": params.system_name, "$options": "i"}
        if params.keyword:
            keyword_regex = {"$regex": params.keyword, "$options": "i"}
            keyword_query = [
                {"name": keyword_regex},
                {"subcategory": keyword_regex},
                {"paper_titles": keyword_regex},
                {"functional_performance.functionality_notes": keyword_regex},
                {"raw_data.description": keyword_regex},
                {"raw_data.functionality_notes": keyword_regex},
            ]
            query = {"$and": [query, {"$or": keyword_query}]}
        total = await self.delivery_collection.count_documents(query)
        skip = (params.page - 1) * params.page_size
        cursor = self.delivery_collection.find(query).skip(skip).limit(params.page_size)
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            items.append(doc)
        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            has_more=(skip + len(items)) < total
        )

    async def get_delivery_by_paper_id(self, paper_id: str) -> List[Dict]:
        """获取指定论文的所有递送系统（biomaterials 中 category=delivery_system）"""
        cursor = self.delivery_collection.find({"category": "delivery_system", "paper_ids": paper_id})
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        return results
    
    # =============================================
    # 微生物特征查询 (新增)
    # =============================================
    
    async def query_micro_features(
        self,
        params: MicroFeatQueryParams
    ) -> PaginatedResponse:
        """
        查询微生物特征数据（biomaterials 集合，category=microbe）。
        关键词搜索：name, subcategory, paper_titles, functional_performance, biological_impact, raw_data。
        """
        query: Dict[str, Any] = {"category": "microbe"}
        if params.paper_id:
            query["paper_ids"] = params.paper_id
        if params.system_type:
            query["subcategory"] = {"$regex": params.system_type, "$options": "i"}
        if params.keyword:
            keyword_regex = {"$regex": params.keyword, "$options": "i"}
            keyword_query = [
                {"name": keyword_regex},
                {"subcategory": keyword_regex},
                {"paper_titles": keyword_regex},
                {"functional_performance.functionality_notes": keyword_regex},
                {"biological_impact.functionality_notes": keyword_regex},
                {"raw_data.description": keyword_regex},
                {"raw_data.mechanism": keyword_regex},
                # 供氧/氧气相关：生长条件中的氧说明
                {"raw_data.chassis_and_growth.growth_conditions.oxygen_notes": keyword_regex},
                {"raw_data.chassis_and_growth.growth_conditions.oxygen_tolerance": keyword_regex},
            ]
            query = {"$and": [query, {"$or": keyword_query}]}
        total = await self.micro_collection.count_documents(query)
        skip = (params.page - 1) * params.page_size
        cursor = self.micro_collection.find(query).skip(skip).limit(params.page_size)
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            items.append(doc)
        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            has_more=(skip + len(items)) < total
        )
    
    async def get_micro_by_paper_id(self, paper_id: str) -> List[Dict]:
        """获取指定论文的所有微生物特征（biomaterials 中 category=microbe）"""
        cursor = self.micro_collection.find({"category": "microbe", "paper_ids": paper_id})
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        return results
    
    # =============================================
    # 论文标签查询 (新增)
    # =============================================
    
    async def query_paper_tags(
        self,
        params: PaperTagQueryParams
    ) -> PaginatedResponse:
        """
        查询论文标签数据
        
        支持按 paper_id、分类层级筛选，以及标题/摘要关键词搜索
        """
        query: Dict[str, Any] = {}
        
        if params.paper_id:
            query["paper_id"] = params.paper_id
        
        if params.classification:
            query["classification"] = {"$regex": params.classification, "$options": "i"}
        
        if params.l1:
            query["l1"] = {"$regex": params.l1, "$options": "i"}
        
        if params.l2:
            query["l2"] = {"$regex": params.l2, "$options": "i"}
        
        if params.keyword:
            keyword_regex = {"$regex": params.keyword, "$options": "i"}
            query["$or"] = [
                {"title": keyword_regex},
                {"abstract": keyword_regex},
            ]
        
        total = await self.tags_collection.count_documents(query)
        
        skip = (params.page - 1) * params.page_size
        cursor = self.tags_collection.find(query).skip(skip).limit(params.page_size)
        
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            items.append(doc)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            has_more=(skip + len(items)) < total
        )
    
    async def get_paper_tags(self, paper_id: str) -> Optional[Dict]:
        """获取指定论文的标签信息"""
        doc = await self.tags_collection.find_one({"paper_id": paper_id})
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
        """
        按标签搜索论文
        
        tags: 可以是 l1, l2, l3 中的任意标签
        """
        if not tags:
            return PaginatedResponse(
                items=[], total=0, page=page, page_size=page_size, has_more=False
            )
        
        # 构建标签匹配查询
        tag_conditions = []
        for tag in tags:
            tag_regex = {"$regex": tag, "$options": "i"}
            tag_conditions.append({"l1": tag_regex})
            tag_conditions.append({"l2": tag_regex})
            tag_conditions.append({"l3": tag_regex})
            tag_conditions.append({"classification": tag_regex})
        
        query = {"$or": tag_conditions}
        
        total = await self.tags_collection.count_documents(query)
        
        skip = (page - 1) * page_size
        cursor = self.tags_collection.find(query).skip(skip).limit(page_size)
        
        items = []
        async for doc in cursor:
            doc.pop("_id", None)
            items.append(doc)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=(skip + len(items)) < total
        )
    
    # =============================================
    # 统计信息 (新增)
    # =============================================
    
    async def get_stats(self) -> BioExtractStats:
        """获取 BioExtract 数据统计（biomaterials 按 category 分类计数）"""
        delivery_count = await self.delivery_collection.count_documents({"category": "delivery_system"})
        micro_count = await self.micro_collection.count_documents({"category": "microbe"})
        tags_count = await self.tags_collection.count_documents({})
        atps_count = await self.atps_collection.count_documents({})
        
        return BioExtractStats(
            delivery_systems_count=delivery_count,
            micro_features_count=micro_count,
            paper_tags_count=tags_count,
            atps_records_count=atps_count,
            last_updated=datetime.now()
        )
    
    # =============================================
    # 分类聚合 (新增)
    # =============================================
    
    async def get_delivery_carrier_types(self) -> List[Dict[str, Any]]:
        """获取所有载体类型及其计数（按 subcategory 聚合）"""
        pipeline = [
            {"$match": {"category": "delivery_system", "subcategory": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$subcategory", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 50}
        ]

        results = []
        async for doc in self.delivery_collection.aggregate(pipeline):
            results.append({"carrier_type": doc["_id"], "count": doc["count"]})
        return results

    async def get_micro_system_types(self) -> List[Dict[str, Any]]:
        """获取所有微生物系统类型及其计数（按 subcategory 聚合）"""
        pipeline = [
            {"$match": {"category": "microbe", "subcategory": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$subcategory", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 50}
        ]

        results = []
        async for doc in self.micro_collection.aggregate(pipeline):
            results.append({"system_type": doc["_id"], "count": doc["count"]})
        return results
    
    async def get_tag_classifications(self) -> List[Dict[str, Any]]:
        """获取论文分类统计（按 l1 分组）"""
        pipeline = [
            {"$match": {"l1": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$l1", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        results = []
        async for doc in self.tags_collection.aggregate(pipeline):
            results.append({"classification": doc["_id"], "count": doc["count"]})
        return results


# 创建全局服务实例
bioextract_service = BioExtractService()
