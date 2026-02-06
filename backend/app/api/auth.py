"""
用户认证API路由
"""

from fastapi import APIRouter, HTTPException, Depends, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.models.user import UserCreate, UserLogin, Token, UserResponse, UserUpdate, User
from app.services.auth_service import auth_service

router = APIRouter()
security = HTTPBearer()

# 依赖项：获取当前用户
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """从token获取当前用户"""
    token = credentials.credentials
    token_data = auth_service.decode_token(token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(token_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    return user

# 可选的当前用户（允许匿名访问）
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[User]:
    """可选的用户认证"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

# 依赖项：要求管理员权限
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """验证当前用户是否为管理员"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user

@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate):
    """用户注册"""
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

@router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    """用户登录"""
    user = await auth_service.authenticate_user(user_login.username, user_login.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = await auth_service.create_tokens(user)
    return token

@router.post("/auth/refresh", response_model=Token)
async def refresh_token(refresh_token: str = Body(..., embed=True)):
    """刷新访问令牌"""
    token = await auth_service.refresh_access_token(refresh_token)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token

@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar=current_user.avatar,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.put("/auth/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """更新当前用户信息"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    if update_data:
        from datetime import datetime
        update_data["updated_at"] = datetime.now()
        
        await auth_service.collection().update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        # 重新获取用户
        updated_user = await auth_service.get_user_by_id(current_user.id)
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
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar=current_user.avatar,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """用户登出（客户端需要删除token）"""
    return {"message": "登出成功"}
