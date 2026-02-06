"""
用户管理API路由（管理员功能）
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from app.models.user import UserCreate, UserResponse, UserUpdate, User
from app.services.auth_service import auth_service
from app.api.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin)
):
    """获取所有用户列表（管理员）"""
    users = await auth_service.get_all_users(skip=skip, limit=limit)
    return [
        UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            avatar=user.avatar,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )
        for user in users
    ]

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_create: UserCreate,
    current_user: User = Depends(require_admin)
):
    """创建新用户（管理员）"""
    try:
        user = await auth_service.create_user(user_create)
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            avatar=user.avatar,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    """获取指定用户信息（管理员）"""
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        avatar=user.avatar,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_admin)
):
    """更新用户信息（管理员）"""
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    if update_data:
        from datetime import datetime
        update_data["updated_at"] = datetime.now()
        
        await auth_service.collection().update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        # 重新获取用户
        updated_user = await auth_service.get_user_by_id(user_id)
        return UserResponse(
            id=updated_user.id,
            username=updated_user.username,
            email=updated_user.email,
            full_name=updated_user.full_name,
            avatar=updated_user.avatar,
            role=updated_user.role,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at,
            last_login=updated_user.last_login
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        avatar=user.avatar,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    """删除用户（管理员）"""
    # 不能删除自己
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )
    
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    result = await auth_service.collection().delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="删除失败"
        )
    
    return {"message": "用户删除成功"}

@router.post("/users/{user_id}/toggle")
async def toggle_user_active(
    user_id: str,
    is_active: bool,
    current_user: User = Depends(require_admin)
):
    """启用/禁用用户（管理员）"""
    # 不能禁用自己
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能禁用自己的账号"
        )
    
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    from datetime import datetime
    await auth_service.collection().update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now()}}
    )
    
    return {"message": f"用户已{'启用' if is_active else '禁用'}"}

