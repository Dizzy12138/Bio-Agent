"""
对话记录服务（新架构）
实现 conversations 和 messages 的 CRUD 操作
严格按照用户隔离和性能优化要求
"""

from app.db.mongo import mongodb
from app.models.conversation import (
    ConversationDocument, MessageDocument, ConversationCreate,
    ConversationUpdate, ConversationWithMessages, ConversationListResponse,
    ConversationQuery, MessageCreate, MessageRole, MessageMetadata
)
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)


class ConversationService:
    """对话记录服务"""
    
    def __init__(self):
        self.conversations_collection = "conversations"
        self.messages_collection = "messages"
    
    async def _ensure_indexes(self):
        """确保必要的索引存在（性能优化）"""
        try:
            db = mongodb.db
            
            # conversations 集合索引
            await db[self.conversations_collection].create_index("user_id")
            await db[self.conversations_collection].create_index("created_at")
            await db[self.conversations_collection].create_index([("user_id", 1), ("created_at", -1)])
            
            # messages 集合索引（关键：避免全表扫描）
            await db[self.messages_collection].create_index("conversation_id")
            await db[self.messages_collection].create_index("timestamp")
            await db[self.messages_collection].create_index([("conversation_id", 1), ("timestamp", 1)])
            
            logger.info("✅ 对话记录索引创建成功")
        except Exception as e:
            logger.error(f"❌ 创建索引失败: {e}")
    
    # ==================== 会话管理 ====================
    
    async def create_conversation(
        self, 
        user_id: str, 
        conversation_create: ConversationCreate
    ) -> ConversationDocument:
        """创建新会话"""
        try:
            conversation = ConversationDocument(
                id=f"conv-{uuid4().hex[:12]}",
                user_id=user_id,
                title=conversation_create.title or "新对话",
                model=conversation_create.model,
                expert_id=conversation_create.expert_id,
                expert_name=conversation_create.expert_name,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            db = mongodb.db
            await db[self.conversations_collection].insert_one(conversation.dict())
            
            logger.info(f"✅ 创建会话: {conversation.id} (用户: {user_id})")
            return conversation
        except Exception as e:
            logger.error(f"❌ 创建会话失败: {e}")
            raise
    
    async def get_conversations(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        include_archived: bool = False
    ) -> ConversationListResponse:
        """获取用户的会话列表（分页）"""
        try:
            db = mongodb.db
            
            # 构建查询条件（用户隔离）
            query: Dict[str, Any] = {"user_id": user_id}
            if not include_archived:
                query["is_archived"] = {"$ne": True}
            
            # 计算总数
            total = await db[self.conversations_collection].count_documents(query)
            
            # 分页查询
            skip = (page - 1) * page_size
            cursor = db[self.conversations_collection].find(query).sort("updated_at", -1).skip(skip).limit(page_size)
            
            items = []
            async for doc in cursor:
                items.append(ConversationDocument(**doc))
            
            return ConversationListResponse(
                items=items,
                total=total,
                page=page,
                page_size=page_size,
                has_more=(skip + len(items)) < total
            )
        except Exception as e:
            logger.error(f"❌ 获取会话列表失败: {e}")
            raise
    
    async def get_conversation(
        self, 
        conversation_id: str, 
        user_id: str
    ) -> Optional[ConversationDocument]:
        """获取单个会话（验证用户权限）"""
        try:
            db = mongodb.db
            doc = await db[self.conversations_collection].find_one({
                "id": conversation_id,
                "user_id": user_id  # 用户隔离
            })
            
            if doc:
                return ConversationDocument(**doc)
            return None
        except Exception as e:
            logger.error(f"❌ 获取会话失败: {e}")
            raise
    
    async def update_conversation(
        self,
        conversation_id: str,
        user_id: str,
        update_data: ConversationUpdate
    ) -> Optional[ConversationDocument]:
        """更新会话"""
        try:
            db = mongodb.db
            
            update_dict = update_data.dict(exclude_unset=True)
            if not update_dict:
                return await self.get_conversation(conversation_id, user_id)
            
            update_dict["updated_at"] = datetime.now()
            
            result = await db[self.conversations_collection].update_one(
                {"id": conversation_id, "user_id": user_id},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                logger.info(f"✅ 更新会话: {conversation_id}")
                return await self.get_conversation(conversation_id, user_id)
            return None
        except Exception as e:
            logger.error(f"❌ 更新会话失败: {e}")
            raise
    
    async def delete_conversation(
        self, 
        conversation_id: str, 
        user_id: str
    ) -> bool:
        """删除会话（级联删除消息）"""
        try:
            db = mongodb.db
            
            # 1. 删除会话
            result = await db[self.conversations_collection].delete_one({
                "id": conversation_id,
                "user_id": user_id
            })
            
            if result.deleted_count > 0:
                # 2. 级联删除所有消息
                msg_result = await db[self.messages_collection].delete_many({
                    "conversation_id": conversation_id
                })
                
                logger.info(f"✅ 删除会话: {conversation_id} (删除 {msg_result.deleted_count} 条消息)")
                return True
            
            return False
        except Exception as e:
            logger.error(f"❌ 删除会话失败: {e}")
            raise
    
    # ==================== 消息管理 ====================
    
    async def add_message(
        self,
        conversation_id: str,
        user_id: str,
        role: MessageRole,
        content: str,
        metadata: Optional[MessageMetadata] = None
    ) -> MessageDocument:
        """添加消息到会话（异步存储）"""
        try:
            db = mongodb.db
            
            # 验证会话所有权
            conversation = await self.get_conversation(conversation_id, user_id)
            if not conversation:
                raise ValueError(f"会话不存在或无权限: {conversation_id}")
            
            # 创建消息
            message = MessageDocument(
                id=f"msg-{uuid4().hex[:12]}",
                conversation_id=conversation_id,
                role=role,
                content=content,
                metadata=metadata,
                timestamp=datetime.now()
            )
            
            # 插入消息
            await db[self.messages_collection].insert_one(message.dict())
            
            # 更新会话统计
            await db[self.conversations_collection].update_one(
                {"id": conversation_id, "user_id": user_id},
                {
                    "$inc": {"message_count": 1},
                    "$set": {"updated_at": datetime.now()}
                }
            )
            
            logger.debug(f"✅ 添加消息: {message.id} -> {conversation_id}")
            return message
        except Exception as e:
            logger.error(f"❌ 添加消息失败: {e}")
            raise
    
    async def get_messages(
        self,
        conversation_id: str,
        user_id: str,
        limit: Optional[int] = None
    ) -> List[MessageDocument]:
        """获取会话的所有消息（使用索引优化）"""
        try:
            db = mongodb.db
            
            # 验证会话所有权
            conversation = await self.get_conversation(conversation_id, user_id)
            if not conversation:
                raise ValueError(f"会话不存在或无权限: {conversation_id}")
            
            # 查询消息（使用 conversation_id 索引）
            query = {"conversation_id": conversation_id}
            cursor = db[self.messages_collection].find(query).sort("timestamp", 1)
            
            if limit:
                cursor = cursor.limit(limit)
            
            messages = []
            async for doc in cursor:
                messages.append(MessageDocument(**doc))
            
            return messages
        except Exception as e:
            logger.error(f"❌ 获取消息失败: {e}")
            raise
    
    async def get_conversation_with_messages(
        self,
        conversation_id: str,
        user_id: str
    ) -> Optional[ConversationWithMessages]:
        """获取会话及其完整消息流"""
        try:
            conversation = await self.get_conversation(conversation_id, user_id)
            if not conversation:
                return None
            
            messages = await self.get_messages(conversation_id, user_id)
            
            return ConversationWithMessages(
                conversation=conversation,
                messages=messages
            )
        except Exception as e:
            logger.error(f"❌ 获取会话详情失败: {e}")
            raise
    
    # ==================== 管理员查询接口 ====================
    
    async def admin_query_conversations(
        self,
        query_params: ConversationQuery
    ) -> ConversationListResponse:
        """管理员查询对话（支持多条件筛选）"""
        try:
            db = mongodb.db
            
            # 构建查询条件
            query: Dict[str, Any] = {}
            
            # 用户筛选
            if query_params.user_id:
                query["user_id"] = query_params.user_id
            
            # 关键词搜索
            if query_params.keyword:
                query["$or"] = [
                    {"title": {"$regex": query_params.keyword, "$options": "i"}},
                    {"expert_name": {"$regex": query_params.keyword, "$options": "i"}}
                ]
            
            # 时间范围
            if query_params.start_date or query_params.end_date:
                query["created_at"] = {}
                if query_params.start_date:
                    query["created_at"]["$gte"] = query_params.start_date
                if query_params.end_date:
                    query["created_at"]["$lte"] = query_params.end_date
            
            # 状态筛选
            if query_params.is_archived is not None:
                query["is_archived"] = query_params.is_archived
            if query_params.is_favorite is not None:
                query["is_favorite"] = query_params.is_favorite
            
            # 计算总数
            total = await db[self.conversations_collection].count_documents(query)
            
            # 分页查询
            skip = (query_params.page - 1) * query_params.page_size
            cursor = db[self.conversations_collection].find(query).sort("updated_at", -1).skip(skip).limit(query_params.page_size)
            
            items = []
            async for doc in cursor:
                items.append(ConversationDocument(**doc))
            
            return ConversationListResponse(
                items=items,
                total=total,
                page=query_params.page,
                page_size=query_params.page_size,
                has_more=(skip + len(items)) < total
            )
        except Exception as e:
            logger.error(f"❌ 管理员查询失败: {e}")
            raise
    
    async def admin_get_conversation_with_messages(
        self,
        conversation_id: str
    ) -> Optional[ConversationWithMessages]:
        """管理员获取会话详情（无用户限制）"""
        try:
            db = mongodb.db
            
            # 获取会话
            doc = await db[self.conversations_collection].find_one({"id": conversation_id})
            if not doc:
                return None
            
            conversation = ConversationDocument(**doc)
            
            # 获取消息
            cursor = db[self.messages_collection].find({"conversation_id": conversation_id}).sort("timestamp", 1)
            messages = []
            async for msg_doc in cursor:
                messages.append(MessageDocument(**msg_doc))
            
            return ConversationWithMessages(
                conversation=conversation,
                messages=messages
            )
        except Exception as e:
            logger.error(f"❌ 管理员获取会话详情失败: {e}")
            raise
    
    async def admin_delete_conversation(
        self,
        conversation_id: str
    ) -> bool:
        """管理员删除会话（无用户限制）"""
        try:
            db = mongodb.db
            
            # 删除会话
            result = await db[self.conversations_collection].delete_one({"id": conversation_id})
            
            if result.deleted_count > 0:
                # 级联删除消息
                msg_result = await db[self.messages_collection].delete_many({"conversation_id": conversation_id})
                logger.info(f"✅ 管理员删除会话: {conversation_id} (删除 {msg_result.deleted_count} 条消息)")
                return True
            
            return False
        except Exception as e:
            logger.error(f"❌ 管理员删除会话失败: {e}")
            raise


# 全局实例
conversation_service = ConversationService()

