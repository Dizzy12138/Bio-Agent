"""
对话管理API路由（统一持久化版本）
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional
from app.models.chat import (
    ChatRequest, Conversation, Message, 
    ConversationCreate, ConversationUpdate
)
from app.services.chat_db import chat_service
from app.services.llm import llm_service
from app.services.config_db import config_service
from app.api.auth import get_current_user
from app.models.user import User
from app.services.conversation_service import conversation_service
from app.models.conversation import ConversationUpdate as NewConversationUpdate
from uuid import uuid4
import json
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== 对话管理 ====================

@router.post("/conversations", response_model=Conversation)
async def create_conversation(
    conversation_create: ConversationCreate,
    current_user: User = Depends(get_current_user)
):
    """创建新对话"""
    conversation = await chat_service.create_conversation(current_user.id, conversation_create)
    return conversation

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    include_archived: bool = False,
    current_user: User = Depends(get_current_user)
):
    """获取对话列表"""
    conversations = await chat_service.get_conversations(
        current_user.id, 
        limit=limit, 
        skip=skip,
        include_archived=include_archived
    )
    return conversations

@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取单个对话"""
    conversation = await chat_service.get_conversation(conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    return conversation

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取对话的所有消息（从 chat_service 的嵌入式消息数组中读取）"""
    try:
        conversation = await chat_service.get_conversation(conversation_id, current_user.id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在或无权访问")
        
        # 返回消息列表（chat_service 将消息嵌入在 conversation.messages 内）
        messages = [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat() if msg.created_at else None,
                "metadata": msg.metadata,
            }
            for msg in conversation.messages
        ]
        
        return messages
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取消息失败: {str(e)}")

@router.put("/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: str,
    conversation_update: ConversationUpdate,
    current_user: User = Depends(get_current_user)
):
    """更新对话"""
    conversation = await chat_service.update_conversation(
        conversation_id, 
        current_user.id, 
        conversation_update
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    return conversation

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除对话"""
    success = await chat_service.delete_conversation(conversation_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "删除成功"}

# ==================== 对话操作 ====================

@router.post("/conversations/{conversation_id}/pin")
async def pin_conversation(
    conversation_id: str,
    is_pinned: bool,
    current_user: User = Depends(get_current_user)
):
    """置顶/取消置顶对话"""
    success = await chat_service.pin_conversation(conversation_id, current_user.id, is_pinned)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "操作成功"}

@router.post("/conversations/{conversation_id}/favorite")
async def favorite_conversation(
    conversation_id: str,
    is_favorite: bool,
    current_user: User = Depends(get_current_user)
):
    """收藏/取消收藏对话"""
    success = await chat_service.favorite_conversation(conversation_id, current_user.id, is_favorite)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "操作成功"}

@router.post("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    is_archived: bool,
    current_user: User = Depends(get_current_user)
):
    """归档/取消归档对话"""
    success = await chat_service.archive_conversation(conversation_id, current_user.id, is_archived)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "操作成功"}

@router.post("/conversations/{conversation_id}/tags")
async def add_tag(
    conversation_id: str,
    tag: str,
    current_user: User = Depends(get_current_user)
):
    """添加标签"""
    success = await chat_service.add_tag(conversation_id, current_user.id, tag)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "标签添加成功"}

@router.delete("/conversations/{conversation_id}/tags/{tag}")
async def remove_tag(
    conversation_id: str,
    tag: str,
    current_user: User = Depends(get_current_user)
):
    """移除标签"""
    success = await chat_service.remove_tag(conversation_id, current_user.id, tag)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "标签移除成功"}

# ==================== 消息管理 ====================

@router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def add_message(
    conversation_id: str,
    message: Message,
    current_user: User = Depends(get_current_user)
):
    """添加消息"""
    success = await chat_service.add_message(conversation_id, current_user.id, message)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return message

@router.post("/conversations/{conversation_id}/log-user-message")
async def log_user_message(
    conversation_id: str,
    content: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """记录用户消息"""
    try:
        user_msg = Message(
            id=f"msg-{uuid4().hex[:12]}",
            role="user",
            content=content
        )
        await chat_service.add_message(conversation_id, current_user.id, user_msg)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conversation_id}/log-assistant-message")
async def log_assistant_message(
    conversation_id: str,
    content: str = Body(...),
    model: Optional[str] = Body(None),
    tokens: Optional[int] = Body(None),
    latency: Optional[float] = Body(None),
    temperature: Optional[float] = Body(None),
    current_user: User = Depends(get_current_user)
):
    """记录助手消息"""
    try:
        ai_msg = Message(
            id=f"msg-{uuid4().hex[:12]}",
            role="assistant",
            content=content
        )
        await chat_service.add_message(conversation_id, current_user.id, ai_msg)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conversation_id}/generate-title")
async def generate_conversation_title(
    conversation_id: str,
    user_message: str = Body(...),
    assistant_message: str = Body(...),
    current_user: User = Depends(get_current_user)
):
    """根据第一轮对话生成标题"""
    try:
        # 验证对话所有权
        conversation = await conversation_service.get_conversation(conversation_id, current_user.id)
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        
        # 使用 LLM 生成标题
        prompt = f"""请根据以下对话内容，生成一个简洁的标题（不超过20个字）。只返回标题文本，不要有任何其他内容。

用户: {user_message[:200]}

助手: {assistant_message[:300]}

标题:"""
        
        # 调用 LLM 生成标题
        messages = [{"role": "user", "content": prompt}]
        title = ""
        async for chunk in llm_service.stream_chat(messages, model="gpt-3.5-turbo", temperature=0.7):
            title += chunk
        
        # 清理标题（去除引号、换行等）
        title = title.strip().strip('"').strip("'").strip()
        if len(title) > 30:
            title = title[:30] + "..."
        
        # 更新对话标题
        await conversation_service.update_conversation(
            conversation_id,
            current_user.id,
            NewConversationUpdate(title=title)
        )
        
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/conversations/{conversation_id}/messages/{message_id}")
async def update_message(
    conversation_id: str,
    message_id: str,
    content: str,
    current_user: User = Depends(get_current_user)
):
    """更新消息"""
    success = await chat_service.update_message(conversation_id, current_user.id, message_id, content)
    if not success:
        raise HTTPException(status_code=404, detail="消息不存在")
    return {"message": "更新成功"}

@router.delete("/conversations/{conversation_id}/messages/{message_id}")
async def delete_message(
    conversation_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除消息"""
    success = await chat_service.delete_message(conversation_id, current_user.id, message_id)
    if not success:
        raise HTTPException(status_code=404, detail="消息不存在")
    return {"message": "删除成功"}

# ==================== 搜索和筛选 ====================

@router.get("/conversations/search", response_model=List[Conversation])
async def search_conversations(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """搜索对话"""
    conversations = await chat_service.search_conversations(current_user.id, query, limit)
    return conversations

@router.get("/conversations/expert/{expert_id}", response_model=List[Conversation])
async def get_conversations_by_expert(
    expert_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """获取特定专家的对话"""
    conversations = await chat_service.get_conversations_by_expert(current_user.id, expert_id, limit)
    return conversations

@router.get("/conversations/favorites", response_model=List[Conversation])
async def get_favorite_conversations(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """获取收藏的对话"""
    conversations = await chat_service.get_favorite_conversations(current_user.id, limit)
    return conversations

# ==================== 聊天完成（流式，集成新记录系统） ====================

async def _generate_title(user_message: str, ai_response: str, model: str) -> str:
    """使用 LLM 根据首轮对话生成简短标题"""
    try:
        prompt_messages = [
            {
                "role": "system",
                "content": (
                    "你是一个标题生成器。根据用户的问题和AI的回答，生成一个简洁的对话标题。"
                    "要求：1) 不超过20个字；2) 直接输出标题文字，不要加引号或其他标点；"
                    "3) 用中文；4) 概括对话主题。"
                ),
            },
            {
                "role": "user",
                "content": f"用户问题：{user_message[:200]}\n\nAI回答：{ai_response[:300]}\n\n请生成标题：",
            },
        ]
        title = ""
        async for chunk in llm_service.stream_chat(
            prompt_messages, model=model, temperature=0.3, max_tokens=40
        ):
            title += chunk
        # 清理：去除引号、换行，截断
        title = title.strip().strip('"').strip("'").strip("《》").strip()
        if title:
            return title[:30]
    except Exception as e:
        logger.warning(f"Auto title generation failed: {e}")
    # 降级：截取用户消息
    return (user_message[:20] + "...") if len(user_message) > 20 else user_message


@router.post("/completions")
async def chat_completions(
    req: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """聊天完成（流式响应，自动记录到新系统）"""
    start_time = time.time()
    
    # 1. 获取或创建对话
    conversation_id = req.conversation_id
    is_new_conversation = False
    if not conversation_id:
        is_new_conversation = True
        conversation_create = ConversationCreate(
            title="新对话",
            expert_id=req.expert_id,
            model=req.model
        )
        conversation = await chat_service.create_conversation(current_user.id, conversation_create)
        conversation_id = conversation.id
    else:
        # 验证对话所有权
        conversation = await chat_service.get_conversation(conversation_id, current_user.id)
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
    
    # Verify conversation exists
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    # 2. 记录用户消息
    user_msg = Message(
        id=f"msg-{uuid4().hex[:12]}",
        role="user",
        content=req.message
    )
    await chat_service.add_message(conversation_id, current_user.id, user_msg)

    async def event_generator():
        # 获取系统提示词和模型配置
        system_prompt = "You are a helpful biomedical expert assistant."
        model = req.model or None
        temperature = req.temperature or 0.7

        # If no model specified, try to use system default
        if not model:
            try:
                default_cfg = await config_service.get_default_provider_config()
                if default_cfg and default_cfg.get("model"):
                    model = default_cfg["model"]
            except Exception as e:
                print(f"⚠️  读取默认模型配置失败: {e}")
        
        # Final fallback
        if not model:
            model = "gpt-3.5-turbo"

        if req.expert_id:
            agent_config = await config_service.get_agent(req.expert_id)
            if agent_config:
                system_prompt = agent_config.systemPrompt
                if hasattr(agent_config, 'model') and agent_config.model:
                    model = agent_config.model
        
        # 构建消息历史
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加对话历史（最近10条）
        if conversation:
            recent_messages = conversation.messages[-10:] if len(conversation.messages) > 10 else conversation.messages
            for msg in recent_messages:
                messages.append({"role": msg.role, "content": msg.content})
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": req.message})

        # 流式生成响应
        full_response = ""
        error_msg = None
        try:
            async for chunk in llm_service.stream_chat(messages, model=model, temperature=temperature):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk, 'conversationId': conversation_id})}\n\n"
            
            # 保存助手消息
            ai_msg = Message(
                id=f"msg-{uuid4().hex[:12]}",
                role="assistant",
                content=full_response
            )
            await chat_service.add_message(conversation_id, current_user.id, ai_msg)
            
            # 首轮对话结束后自动生成标题
            if is_new_conversation and full_response:
                try:
                    new_title = await _generate_title(req.message, full_response, model)
                    await chat_service.update_conversation(
                        conversation_id, current_user.id,
                        ConversationUpdate(title=new_title)
                    )
                    # 通知前端更新标题
                    yield f"data: {json.dumps({'type': 'title_generated', 'title': new_title, 'conversationId': conversation_id})}\n\n"
                except Exception as e:
                    logger.warning(f"Failed to update conversation title: {e}")
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Chat completion error: {error_msg}")
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    if req.stream:
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    else:
        # 非流式响应
        full_response = ""
        async for chunk in event_generator():
            if chunk.startswith("data: "):
                data_str = chunk[6:].strip()
                if data_str != "[DONE]":
                    try:
                        data = json.loads(data_str)
                        if "content" in data:
                            full_response += data["content"]
                    except:
                        pass
        
        return {
            "conversation_id": conversation_id,
            "message": full_response
        }
