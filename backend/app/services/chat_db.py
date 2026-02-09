"""
对话管理服务（完整版）
"""

from app.db.mongo import mongodb
from app.models.chat import Conversation, Message, ConversationCreate, ConversationUpdate
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

class ChatService:
    def collection(self):
        return mongodb.db["conversations"]

    async def create_conversation(self, user_id: str, conversation_create: ConversationCreate) -> Conversation:
        """创建新对话"""
        conversation = Conversation(
            id=f"conv-{uuid4().hex[:12]}",
            user_id=user_id,
            title=conversation_create.title or "新对话",
            expert_id=conversation_create.expert_id,
            expert_name=conversation_create.expert_name,
            expert_avatar=conversation_create.expert_avatar,
            messages=[],
            message_count=0,
            model_config=conversation_create.model_config,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        await self.collection().insert_one(conversation.model_dump())
        return conversation

    async def get_conversations(
        self, 
        user_id: str, 
        limit: int = 50,
        skip: int = 0,
        include_archived: bool = False
    ) -> List[Conversation]:
        """获取用户的对话列表"""
        query = {"user_id": user_id}
        if not include_archived:
            query["is_archived"] = {"$ne": True}
        
        cursor = self.collection().find(query).sort("updated_at", -1).skip(skip).limit(limit)
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        return conversations

    async def get_conversation(self, conversation_id: str, user_id: str) -> Optional[Conversation]:
        """获取单个对话"""
        doc = await self.collection().find_one({"id": conversation_id, "user_id": user_id})
        if doc:
            return Conversation(**doc)
        return None

    async def update_conversation(
        self, 
        conversation_id: str, 
        user_id: str, 
        conversation_update: ConversationUpdate
    ) -> Optional[Conversation]:
        """更新对话"""
        update_data = conversation_update.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_conversation(conversation_id, user_id)
        
        update_data["updated_at"] = datetime.now()
        
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_conversation(conversation_id, user_id)
        return None

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """删除对话"""
        result = await self.collection().delete_one({"id": conversation_id, "user_id": user_id})
        return result.deleted_count > 0

    async def add_message(self, conversation_id: str, user_id: str, message: Message) -> bool:
        """添加消息到对话"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {
                "$push": {"messages": message.model_dump()},
                "$inc": {"message_count": 1},
                "$set": {"updated_at": datetime.now()}
            }
        )
        return result.modified_count > 0

    async def update_message(
        self, 
        conversation_id: str, 
        user_id: str, 
        message_id: str, 
        content: str
    ) -> bool:
        """更新消息内容"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id, "messages.id": message_id},
            {"$set": {"messages.$.content": content, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def delete_message(self, conversation_id: str, user_id: str, message_id: str) -> bool:
        """删除消息"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {
                "$pull": {"messages": {"id": message_id}},
                "$inc": {"message_count": -1},
                "$set": {"updated_at": datetime.now()}
            }
        )
        return result.modified_count > 0

    async def pin_conversation(self, conversation_id: str, user_id: str, is_pinned: bool) -> bool:
        """置顶/取消置顶对话"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$set": {"is_pinned": is_pinned, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def favorite_conversation(self, conversation_id: str, user_id: str, is_favorite: bool) -> bool:
        """收藏/取消收藏对话"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$set": {"is_favorite": is_favorite, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def archive_conversation(self, conversation_id: str, user_id: str, is_archived: bool) -> bool:
        """归档/取消归档对话"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$set": {"is_archived": is_archived, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def add_tag(self, conversation_id: str, user_id: str, tag: str) -> bool:
        """添加标签"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$addToSet": {"tags": tag}, "$set": {"updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def remove_tag(self, conversation_id: str, user_id: str, tag: str) -> bool:
        """移除标签"""
        result = await self.collection().update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$pull": {"tags": tag}, "$set": {"updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def search_conversations(
        self, 
        user_id: str, 
        query: str, 
        limit: int = 20
    ) -> List[Conversation]:
        """搜索对话"""
        search_query = {
            "user_id": user_id,
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"messages.content": {"$regex": query, "$options": "i"}}
            ]
        }
        
        cursor = self.collection().find(search_query).sort("updated_at", -1).limit(limit)
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        return conversations

    async def get_conversations_by_expert(
        self, 
        user_id: str, 
        expert_id: str, 
        limit: int = 20
    ) -> List[Conversation]:
        """获取特定专家的对话"""
        cursor = self.collection().find({
            "user_id": user_id,
            "expert_id": expert_id
        }).sort("updated_at", -1).limit(limit)
        
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        return conversations

    async def get_favorite_conversations(self, user_id: str, limit: int = 20) -> List[Conversation]:
        """获取收藏的对话"""
        cursor = self.collection().find({
            "user_id": user_id,
            "is_favorite": True
        }).sort("updated_at", -1).limit(limit)
        
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        return conversations

chat_service = ChatService()
