"""
抽取演练场服务
"""

from app.db.mongo import mongodb
from app.models.playground import (
    PlaygroundSession, PlaygroundSessionCreate, PlaygroundSessionUpdate,
    PlaygroundDocument, PlaygroundMessage, PlaygroundExtractedRow
)
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

class PlaygroundService:
    def collection(self):
        return mongodb.db["playground_sessions"]

    async def create_session(
        self, 
        user_id: str, 
        session_create: PlaygroundSessionCreate
    ) -> PlaygroundSession:
        """创建新会话"""
        session = PlaygroundSession(
            id=f"playground-{uuid4().hex[:12]}",
            user_id=user_id,
            title=session_create.title,
            description=session_create.description,
            llm_config=session_create.llm_config,
            documents=[],
            schema=[],
            extracted_rows=[],
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        await self.collection().insert_one(session.model_dump())
        return session

    async def get_sessions(
        self, 
        user_id: str, 
        limit: int = 50,
        skip: int = 0,
        include_archived: bool = False
    ) -> List[PlaygroundSession]:
        """获取用户的会话列表"""
        query = {"user_id": user_id}
        if not include_archived:
            query["is_archived"] = {"$ne": True}
        
        cursor = self.collection().find(query).sort("updated_at", -1).skip(skip).limit(limit)
        sessions = []
        async for doc in cursor:
            sessions.append(PlaygroundSession(**doc))
        return sessions

    async def get_session(self, session_id: str, user_id: str) -> Optional[PlaygroundSession]:
        """获取单个会话"""
        doc = await self.collection().find_one({"id": session_id, "user_id": user_id})
        if doc:
            return PlaygroundSession(**doc)
        return None

    async def update_session(
        self, 
        session_id: str, 
        user_id: str, 
        session_update: PlaygroundSessionUpdate
    ) -> Optional[PlaygroundSession]:
        """更新会话"""
        update_data = session_update.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_session(session_id, user_id)
        
        update_data["updated_at"] = datetime.now()
        
        result = await self.collection().update_one(
            {"id": session_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_session(session_id, user_id)
        return None

    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """删除会话"""
        result = await self.collection().delete_one({"id": session_id, "user_id": user_id})
        return result.deleted_count > 0

    async def add_document(
        self, 
        session_id: str, 
        user_id: str, 
        document: PlaygroundDocument
    ) -> bool:
        """添加文档"""
        result = await self.collection().update_one(
            {"id": session_id, "user_id": user_id},
            {
                "$push": {"documents": document.model_dump()},
                "$set": {"updated_at": datetime.now()}
            }
        )
        return result.modified_count > 0

    async def remove_document(self, session_id: str, user_id: str, document_id: str) -> bool:
        """移除文档"""
        result = await self.collection().update_one(
            {"id": session_id, "user_id": user_id},
            {
                "$pull": {"documents": {"id": document_id}},
                "$set": {"updated_at": datetime.now()}
            }
        )
        return result.modified_count > 0

    async def add_message(
        self, 
        session_id: str, 
        user_id: str, 
        message: PlaygroundMessage
    ) -> bool:
        """添加消息"""
        result = await self.collection().update_one(
            {"id": session_id, "user_id": user_id},
            {
                "$push": {"messages": message.model_dump()},
                "$set": {"updated_at": datetime.now()}
            }
        )
        return result.modified_count > 0

    async def update_extracted_data(
        self, 
        session_id: str, 
        user_id: str, 
        extracted_rows: List[PlaygroundExtractedRow]
    ) -> bool:
        """更新提取的数据"""
        result = await self.collection().update_one(
            {"id": session_id, "user_id": user_id},
            {
                "$set": {
                    "extracted_rows": [row.model_dump() for row in extracted_rows],
                    "updated_at": datetime.now()
                }
            }
        )
        return result.modified_count > 0

    async def archive_session(self, session_id: str, user_id: str, is_archived: bool) -> bool:
        """归档/取消归档会话"""
        result = await self.collection().update_one(
            {"id": session_id, "user_id": user_id},
            {"$set": {"is_archived": is_archived, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

playground_service = PlaygroundService()

