from app.db.mongo import mongodb
from app.models.knowledge import KnowledgeBase
from typing import List, Optional
from datetime import datetime

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

knowledge_service = KnowledgeService()
