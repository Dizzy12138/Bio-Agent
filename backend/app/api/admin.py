"""
管理员 API - 对话记录管理
提供系统管理员查看、筛选、删除所有用户对话记录的接口
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.conversation import (
    ConversationListResponse, ConversationWithMessages, ConversationQuery
)
from app.services.conversation_service import conversation_service
from app.api.auth import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/admin")


@router.get("/conversations", response_model=ConversationListResponse)
async def admin_get_conversations(
    user_id: Optional[str] = Query(None, description="按用户ID筛选"),
    keyword: Optional[str] = Query(None, description="关键词搜索（标题、专家名称）"),
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    is_archived: Optional[bool] = Query(None, description="是否归档"),
    is_favorite: Optional[bool] = Query(None, description="是否收藏"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(require_admin)
):
    """
    管理员查询所有对话记录
    
    支持多条件筛选：
    - user_id: 按用户筛选
    - keyword: 关键词搜索
    - start_date/end_date: 时间范围
    - is_archived/is_favorite: 状态筛选
    """
    try:
        query_params = ConversationQuery(
            user_id=user_id,
            keyword=keyword,
            start_date=start_date,
            end_date=end_date,
            is_archived=is_archived,
            is_favorite=is_favorite,
            page=page,
            page_size=page_size
        )
        
        result = await conversation_service.admin_query_conversations(query_params)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationWithMessages)
async def admin_get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(require_admin)
):
    """
    管理员获取指定会话的完整聊天流
    
    返回会话信息和所有消息（按时间排序）
    """
    try:
        result = await conversation_service.admin_get_conversation_with_messages(conversation_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def admin_delete_conversation(
    conversation_id: str,
    current_user: User = Depends(require_admin)
):
    """
    管理员删除会话（级联删除所有消息）
    
    此操作不可恢复，请谨慎使用
    """
    try:
        success = await conversation_service.admin_delete_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        return {
            "success": True,
            "message": "会话已删除",
            "conversation_id": conversation_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.get("/conversations/stats")
async def admin_get_conversation_stats(
    current_user: User = Depends(require_admin)
):
    """
    获取对话记录统计信息
    
    返回总会话数、总消息数、活跃用户数等
    """
    try:
        from app.db.mongo import mongodb
        db = mongodb.db
        
        # 统计会话数
        total_conversations = await db["conversations"].count_documents({})
        
        # 统计消息数
        total_messages = await db["messages"].count_documents({})
        
        # 统计活跃用户数
        pipeline = [
            {"$group": {"_id": "$user_id"}},
            {"$count": "total"}
        ]
        result = await db["conversations"].aggregate(pipeline).to_list(1)
        active_users = result[0]["total"] if result else 0
        
        # 今日新增会话
        from datetime import datetime, timedelta
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_conversations = await db["conversations"].count_documents({
            "created_at": {"$gte": today_start}
        })
        
        return {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "active_users": active_users,
            "today_conversations": today_conversations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"统计失败: {str(e)}")

