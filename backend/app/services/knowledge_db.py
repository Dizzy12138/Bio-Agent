from app.db.mongo import mongodb
from app.models.knowledge import KnowledgeBase, Material, Assembly, MaterialQueryParams
from typing import List, Optional, Dict, Any
from datetime import datetime
import hashlib

# Mock Data for initialization
INITIAL_KBS = [
    {
        "id": "kb-pubmed",
        "name": "PubMed 生物医学文献库",
        "description": "包含生物医学和生命科学期刊的文献摘要和全文链接",
        "type": "literature",
        "source": "pubmed",
        "documentCount": 35000000,
        "lastSyncAt": datetime(2024, 1, 15, 10, 0, 0),
        "status": "active",
        "icon": "📚"
    },
    {
        "id": "kb-cnki",
        "name": "CNKI 中国知网",
        "description": "中国最大的学术文献数据库，涵盖期刊、博硕士论文等",
        "type": "literature",
        "source": "cnki",
        "documentCount": 8500000,
        "lastSyncAt": datetime(2024, 1, 14, 8, 0, 0),
        "status": "active",
        "icon": "📖"
    }
]

class KnowledgeService:
    @property
    def collection(self):
        return mongodb.db["knowledge_bases"]

    @property
    def materials_collection(self):
        """材料数据集合 - 指向新的 biomaterials 表"""
        return mongodb.db["biomaterials"]

    @property
    def assemblies_collection(self):
        """组装体数据集合"""
        return mongodb.db["assemblies"]

    @property
    def documents_collection(self):
        """文档数据集合"""
        return mongodb.db["documents"]

    async def init_defaults(self):
        # Check if empty, if so, insert mock data
        if await self.collection.count_documents({}) == 0:
            for kb in INITIAL_KBS:
                await self.collection.insert_one(kb)

    async def get_all(self) -> List[KnowledgeBase]:
        cursor = self.collection.find()
        kbs = []
        async for doc in cursor:
            kbs.append(KnowledgeBase(**doc))
        return kbs

    async def get_by_id(self, kb_id: str) -> Optional[KnowledgeBase]:
        doc = await self.collection.find_one({"id": kb_id})
        if doc:
            return KnowledgeBase(**doc)
        return None

    # =============================================
    # Documents CRUD Operations
    # =============================================

    async def search_documents(
        self,
        query: str = "",
        knowledge_base_ids: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        搜索文献，支持按关键词和来源表筛选
        """
        filter_query = {}
        
        # 文本搜索（标题、作者或期刊）
        if query:
            filter_query["$or"] = [
                {"title": {"$regex": query, "$options": "i"}},
                {"authors": {"$regex": query, "$options": "i"}},
                {"journal": {"$regex": query, "$options": "i"}}
            ]
        
        # 来源表筛选 (兼容旧的 knowledgeBaseId 和新的 source_tables)
        if knowledge_base_ids:
            # 将 knowledge_base_ids 映射到 source_tables
            source_map = {
                "kb-delivery": "delivery",
                "kb-microbe": "microbe",
                "delivery": "delivery",
                "microbe": "microbe"
            }
            sources = [source_map.get(kbid, kbid) for kbid in knowledge_base_ids]
            filter_query["source_tables"] = {"$in": sources}
        
        # 计算总数
        total = await self.documents_collection.count_documents(filter_query)
        
        # 分页查询 (按发表年份降序)
        skip = (page - 1) * page_size
        cursor = self.documents_collection.find(filter_query).skip(skip).limit(page_size).sort("publish_year", -1)
        
        documents = []
        async for doc in cursor:
            doc.pop("_id", None)
            # 转换字段名以适配前端期望的格式
            documents.append({
                "id": doc.get("paper_id", ""),
                "title": doc.get("title", ""),
                "authors": doc.get("authors", "").split("; ") if doc.get("authors") else [],
                "source": doc.get("journal", ""),
                "publishDate": str(doc.get("publish_year", "")),
                "type": "paper",
                "knowledgeBaseId": doc.get("source_tables", [""])[0] if doc.get("source_tables") else "",
                "status": "indexed",
                "markdown_url": doc.get("markdown_url"),
                "has_markdown": doc.get("has_markdown", False),
            })
        
        return {
            "documents": documents,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "hasMore": (skip + page_size) < total
        }

    async def get_document_by_id(self, doc_id: str) -> Optional[Dict]:
        """获取单个文献详情（与 search_documents 返回单条格式一致：id/title/authors 数组/source/publishDate）"""
        doc = await self.documents_collection.find_one({"$or": [{"id": doc_id}, {"paper_id": doc_id}]})
        if doc:
            doc.pop("_id", None)
            # 与列表项格式一致，便于文献资料库详情页使用
            return {
                "id": doc.get("paper_id", doc.get("id", "")),
                "title": doc.get("title", ""),
                "authors": doc.get("authors", "").split("; ") if isinstance(doc.get("authors"), str) else (doc.get("authors") or []),
                "source": doc.get("journal", doc.get("source", "")),
                "publishDate": str(doc.get("publish_year", doc.get("publishDate", ""))),
                "type": "paper",
                "knowledgeBaseId": (doc.get("source_tables") or [""])[0],
                "status": "indexed",
                "markdown_url": doc.get("markdown_url"),
                "has_markdown": doc.get("has_markdown", False),
            }
        return None

    async def get_document_categories(self) -> List[Dict[str, Any]]:
        """
        获取文献按期刊来源分类的统计
        用于左侧分类树显示
        """
        pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}  # 只取前20个期刊
        ]
        categories = []
        async for doc in self.documents_collection.aggregate(pipeline):
            if doc["_id"]:
                categories.append({
                    "id": doc["_id"],  # Use source as ID
                    "name": doc["_id"],
                    "count": doc["count"],
                    "type": "journal"
                })
        return categories

    async def get_document_stats(self) -> Dict[str, Any]:
        """获取文献库统计信息"""
        total = await self.documents_collection.count_documents({})
        
        # 按年份统计
        year_pipeline = [
            {"$addFields": {
                "year": {"$substr": ["$publishDate", 0, 4]}
            }},
            {"$group": {"_id": "$year", "count": {"$sum": 1}}},
            {"$sort": {"_id": -1}},
            {"$limit": 10}
        ]
        years = []
        async for doc in self.documents_collection.aggregate(year_pipeline):
            years.append({"year": doc["_id"], "count": doc["count"]})
        
        return {
            "total": total,
            "byYear": years
        }

    # =============================================
    # Materials CRUD Operations
    # =============================================

    async def get_materials(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        has_paper: Optional[bool] = None,
        sort_by: str = "name",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        查询材料列表，支持按名称搜索、分类筛选和排序
        返回格式与前端 Material 接口兼容
        """
        filter_query = {}
        
        # 文本搜索（扩展到更多字段，支持功能性关键词反查）
        if query:
            filter_query["$or"] = [
                # 基础字段
                {"name": {"$regex": query, "$options": "i"}},
                {"id": {"$regex": query, "$options": "i"}},
                # 论文标题数组（最重要，包含功能描述如 "oxygen-generating"）
                {"paper_titles": {"$regex": query, "$options": "i"}},
                # 功能性能描述
                {"functional_performance.functionality_notes": {"$regex": query, "$options": "i"}},
                {"functional_performance.release_kinetics": {"$regex": query, "$options": "i"}},
                # 生物影响
                {"biological_impact.therapeutic_effect": {"$regex": query, "$options": "i"}},
                {"biological_impact.target_tissue": {"$regex": query, "$options": "i"}},
                # raw_data 中的关键字段（微生物特有）
                {"raw_data.chassis_and_growth.growth_conditions.oxygen_notes": {"$regex": query, "$options": "i"}},
                {"raw_data.effector_modules.output_control.mechanism_of_action": {"$regex": query, "$options": "i"}},
                {"raw_data.identity.genus": {"$regex": query, "$options": "i"}},
                {"raw_data.identity.species": {"$regex": query, "$options": "i"}},
            ]
        
        # 分类筛选
        if category:
            filter_query["category"] = category
        if subcategory:
            filter_query["subcategory"] = subcategory
        
        # 关联文献筛选
        if has_paper is True:
            filter_query["paper_id"] = {"$exists": True, "$ne": None, "$ne": ""}
        elif has_paper is False:
            filter_query["$or"] = [
                {"paper_id": {"$exists": False}},
                {"paper_id": None},
                {"paper_id": ""}
            ]
        
        # 计算总数
        total = await self.materials_collection.count_documents(filter_query)
        
        # 排序映射
        sort_field_map = {
            "name": "name",
            "category": "category",
            "subcategory": "subcategory",
            "paper_title": "paper_title",
            "paper_count": "paper_count",
        }
        sort_field = sort_field_map.get(sort_by, "name")
        sort_direction = -1 if sort_order == "desc" else 1
        
        # 分页查询
        skip = (page - 1) * page_size
        cursor = self.materials_collection.find(filter_query).skip(skip).limit(page_size).sort(sort_field, sort_direction)
        
        materials = []
        async for doc in cursor:
            # 转换格式以匹配前端 Material 接口
            composition = doc.get("composition") or {}
            func_perf = doc.get("functional_performance") or {}
            bio_impact = doc.get("biological_impact") or {}
            
            # 构建 properties 数组 (从 composition 和 functional_performance 提取)
            properties = []
            if composition and composition.get("loading_mode"):
                properties.append({"name": "装载方式", "value": composition.get("loading_mode")})
            if composition and composition.get("payload_name"):
                properties.append({"name": "载荷", "value": composition.get("payload_name")})
            if func_perf and func_perf.get("release_kinetics"):
                properties.append({"name": "释放动力学", "value": func_perf.get("release_kinetics")})
            if func_perf and func_perf.get("functionality_notes"):
                notes = func_perf.get("functionality_notes", "")
                properties.append({"name": "功能描述", "value": notes[:100] + "..." if len(notes) > 100 else notes})
            
            # 构建 applications 数组 (从 biological_impact 提取)
            applications = []
            if bio_impact and bio_impact.get("therapeutic_effect"):
                applications.append(bio_impact.get("therapeutic_effect"))
            if bio_impact and bio_impact.get("target_tissue"):
                applications.append(f"靶向: {bio_impact.get('target_tissue')}")
            
            # 映射子分类为中文
            subcategory_map = {
                "delivery": "递送系统",
                "theranostic": "诊疗一体",
                "sensing": "传感",
                "imaging": "成像",
                "bacterium": "细菌",
                "virus": "病毒",
                "fungus": "真菌",
                "microalgae": "微藻",
            }
            
            # 使用聚类后的 paper_ids 数组
            paper_ids = doc.get("paper_ids", [])
            paper_titles = doc.get("paper_titles", [])
            paper_count = doc.get("paper_count", len(paper_ids))
            
            materials.append({
                "id": doc.get("id", ""),
                "name": doc.get("name", ""),
                "category": doc.get("category", ""),
                "subcategory": doc.get("subcategory", ""),
                "abbreviation": None,
                "properties": properties,
                "composition": composition,
                "applications": applications,
                "functional_role": subcategory_map.get(doc.get("subcategory"), doc.get("subcategory")),
                "paper_count": paper_count,
                "source_doc_ids": paper_ids,
                "paper_titles": paper_titles[:5],  # 只返回前5篇
                "createdAt": str(doc.get("created_at", "")),
                "updatedAt": str(doc.get("updated_at", "")),
            })
        
        return {
            "materials": materials,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "hasMore": (skip + page_size) < total
        }

    async def get_material_by_id(self, material_id: str) -> Optional[Dict]:
        """获取单个材料详情"""
        doc = await self.materials_collection.find_one({"id": material_id})
        if doc:
            doc.pop("_id", None)
            return doc
        return None

    async def upsert_material(self, material_data: Dict) -> str:
        """
        插入或更新材料（按 name 去重）
        Returns: material id
        """
        name = material_data.get("name", "")
        
        # Generate deterministic ID from name
        material_id = hashlib.md5(name.encode()).hexdigest()[:16]
        material_data["id"] = material_id
        material_data["updatedAt"] = datetime.now()
        
        existing = await self.materials_collection.find_one({"id": material_id})
        
        if existing:
            # Merge source_doc_ids (avoid duplicates)
            existing_doc_ids = set(existing.get("source_doc_ids", []))
            new_doc_ids = set(material_data.get("source_doc_ids", []))
            material_data["source_doc_ids"] = list(existing_doc_ids | new_doc_ids)
            material_data["paper_count"] = len(material_data["source_doc_ids"])
            
            # Merge applications
            existing_apps = set(existing.get("applications", []))
            new_apps = set(material_data.get("applications", []))
            material_data["applications"] = list(existing_apps | new_apps)
            
            # Keep original createdAt
            material_data["createdAt"] = existing.get("createdAt", datetime.now())
            
            await self.materials_collection.update_one(
                {"id": material_id},
                {"$set": material_data}
            )
        else:
            material_data["createdAt"] = datetime.now()
            material_data["paper_count"] = len(material_data.get("source_doc_ids", []))
            await self.materials_collection.insert_one(material_data)
        
        return material_id

    async def get_material_categories(self) -> List[Dict[str, Any]]:
        """获取所有材料分类及其计数"""
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        categories = []
        async for doc in self.materials_collection.aggregate(pipeline):
            if doc["_id"]:
                categories.append({
                    "category": doc["_id"],
                    "count": doc["count"]
                })
        return categories

    async def get_materials_stats(self) -> Dict[str, Any]:
        """获取材料库统计信息"""
        total_materials = await self.materials_collection.count_documents({})
        total_assemblies = await self.assemblies_collection.count_documents({})
        
        categories = await self.get_material_categories()
        
        return {
            "totalMaterials": total_materials,
            "totalAssemblies": total_assemblies,
            "categories": categories
        }

knowledge_service = KnowledgeService()

