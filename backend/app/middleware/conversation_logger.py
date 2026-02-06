"""
对话记录存储中间件
在 AI 响应完成后自动保存对话记录到 MongoDB
解耦业务逻辑，支持多种 AI 服务接入
"""

from app.services.conversation_service import conversation_service
from app.models.conversation import MessageRole, MessageMetadata
from typing import Optional, Dict, Any
import logging
import time

logger = logging.getLogger(__name__)


class ConversationLogger:
    """对话记录器（中间件）"""
    
    @staticmethod
    async def log_user_message(
        user_id: str,
        conversation_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        记录用户消息
        
        Args:
            user_id: 用户ID
            conversation_id: 会话ID
            content: 消息内容
            metadata: 元数据（可选）
        
        Returns:
            message_id: 消息ID
        """
        try:
            msg_metadata = MessageMetadata(**metadata) if metadata else None
            
            message = await conversation_service.add_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role=MessageRole.USER,
                content=content,
                metadata=msg_metadata
            )
            
            logger.debug(f"✅ 记录用户消息: {message.id}")
            return message.id
        except Exception as e:
            logger.error(f"❌ 记录用户消息失败: {e}")
            # 不抛出异常，避免影响主流程
            return ""
    
    @staticmethod
    async def log_assistant_message(
        user_id: str,
        conversation_id: str,
        content: str,
        model: Optional[str] = None,
        tokens: Optional[int] = None,
        latency: Optional[float] = None,
        cost: Optional[float] = None,
        temperature: Optional[float] = None,
        tool_calls: Optional[list] = None,
        error: Optional[str] = None
    ) -> str:
        """
        记录 AI 助手消息
        
        Args:
            user_id: 用户ID
            conversation_id: 会话ID
            content: 消息内容
            model: 使用的模型
            tokens: token 使用量
            latency: 响应延迟（秒）
            cost: 成本（美元）
            temperature: 温度参数
            tool_calls: 工具调用记录
            error: 错误信息（如果有）
        
        Returns:
            message_id: 消息ID
        """
        try:
            metadata = MessageMetadata(
                model=model,
                tokens=tokens,
                latency=latency,
                cost=cost,
                temperature=temperature,
                tool_calls=tool_calls,
                error=error
            )
            
            message = await conversation_service.add_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role=MessageRole.ASSISTANT,
                content=content,
                metadata=metadata
            )
            
            logger.debug(f"✅ 记录助手消息: {message.id} (tokens: {tokens}, latency: {latency}s)")
            return message.id
        except Exception as e:
            logger.error(f"❌ 记录助手消息失败: {e}")
            return ""
    
    @staticmethod
    async def log_system_message(
        user_id: str,
        conversation_id: str,
        content: str
    ) -> str:
        """记录系统消息"""
        try:
            message = await conversation_service.add_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role=MessageRole.SYSTEM,
                content=content,
                metadata=None
            )
            
            logger.debug(f"✅ 记录系统消息: {message.id}")
            return message.id
        except Exception as e:
            logger.error(f"❌ 记录系统消息失败: {e}")
            return ""
    
    @staticmethod
    async def create_or_get_conversation(
        user_id: str,
        conversation_id: Optional[str] = None,
        title: Optional[str] = None,
        model: Optional[str] = None,
        expert_id: Optional[str] = None,
        expert_name: Optional[str] = None
    ) -> str:
        """
        创建或获取会话
        
        如果提供了 conversation_id，验证并返回；否则创建新会话
        
        Returns:
            conversation_id: 会话ID
        """
        try:
            # 如果提供了会话ID，验证是否存在
            if conversation_id:
                conv = await conversation_service.get_conversation(conversation_id, user_id)
                if conv:
                    return conversation_id
                else:
                    logger.warning(f"⚠️  会话不存在: {conversation_id}，创建新会话")
            
            # 创建新会话
            from app.models.conversation import ConversationCreate
            
            conv_create = ConversationCreate(
                title=title or "新对话",
                model=model,
                expert_id=expert_id,
                expert_name=expert_name
            )
            
            new_conv = await conversation_service.create_conversation(user_id, conv_create)
            logger.info(f"✅ 创建新会话: {new_conv.id}")
            
            return new_conv.id
        except Exception as e:
            logger.error(f"❌ 创建/获取会话失败: {e}")
            raise


class ConversationContext:
    """对话上下文管理器（用于流式响应）"""
    
    def __init__(
        self,
        user_id: str,
        conversation_id: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None
    ):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.model = model
        self.temperature = temperature
        self.start_time = time.time()
        self.accumulated_content = ""
        self.token_count = 0
    
    def append_chunk(self, chunk: str):
        """追加流式响应片段"""
        self.accumulated_content += chunk
    
    def set_token_count(self, count: int):
        """设置 token 数量"""
        self.token_count = count
    
    async def finalize(self, error: Optional[str] = None):
        """
        完成对话并保存
        
        在流式响应结束后调用，保存完整的助手消息
        """
        latency = time.time() - self.start_time
        
        await ConversationLogger.log_assistant_message(
            user_id=self.user_id,
            conversation_id=self.conversation_id,
            content=self.accumulated_content,
            model=self.model,
            tokens=self.token_count,
            latency=latency,
            temperature=self.temperature,
            error=error
        )
        
        logger.info(f"✅ 对话完成: {self.conversation_id} (耗时: {latency:.2f}s, tokens: {self.token_count})")


# 全局实例
conversation_logger = ConversationLogger()

