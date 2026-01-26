from app.db.mongo import mongodb
from app.models.chat import Conversation, Message
from typing import List, Optional
from datetime import datetime

class ChatService:
    @property
    def collection(self):
        return mongodb.db["conversations"]

    async def create_conversation(self, conversation: Conversation) -> Conversation:
        await self.collection.insert_one(conversation.model_dump())
        return conversation

    async def get_conversations(self, limit: int = 20) -> List[Conversation]:
        cursor = self.collection.find().sort("updatedAt", -1).limit(limit)
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        return conversations

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        doc = await self.collection.find_one({"id": conversation_id})
        if doc:
            return Conversation(**doc)
        return None

    async def add_message(self, conversation_id: str, message: Message):
        await self.collection.update_one(
            {"id": conversation_id},
            {
                "$push": {"messages": message.model_dump()},
                "$set": {"updatedAt": datetime.now()}
            }
        )

chat_service = ChatService()
