"""
用户认证模型
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    hashed_password: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login: Optional[datetime] = None
    
    # 用户偏好设置
    preferences: dict = Field(default_factory=dict)
    
    # API使用配额
    api_quota: dict = Field(default_factory=lambda: {
        "daily_requests": 1000,
        "used_requests": 0,
        "reset_at": None
    })

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    preferences: Optional[dict] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    user_id: str
    username: str
    role: UserRole

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str]
    avatar: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

