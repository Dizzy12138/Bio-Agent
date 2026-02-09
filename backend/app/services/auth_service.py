"""
用户认证服务
"""

from app.db.mongo import mongodb
from app.core.config import settings
from app.models.user import User, UserCreate, UserLogin, Token, TokenData, UserRole
from typing import Optional
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from uuid import uuid4
import re
import logging

logger = logging.getLogger(__name__)

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置 — 从统一配置读取
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24小时
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30天

# 密码复杂度正则：至少 8 位，包含大写、小写、数字
_PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$')

class AuthService:
    def collection(self):
        return mongodb.db["users"]
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """生成密码哈希"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """创建访问令牌"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """创建刷新令牌"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def decode_token(self, token: str) -> Optional[TokenData]:
        """解码令牌"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            username: str = payload.get("username")
            role: str = payload.get("role")
            if user_id is None or username is None:
                return None
            return TokenData(user_id=user_id, username=username, role=UserRole(role))
        except jwt.PyJWTError:
            return None
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        doc = await self.collection().find_one({"username": username})
        return User(**doc) if doc else None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """根据邮箱获取用户"""
        doc = await self.collection().find_one({"email": email})
        return User(**doc) if doc else None
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """根据ID获取用户"""
        doc = await self.collection().find_one({"id": user_id})
        return User(**doc) if doc else None
    
    async def get_all_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """获取所有用户列表"""
        cursor = self.collection().find().skip(skip).limit(limit).sort("created_at", -1)
        users = []
        async for doc in cursor:
            users.append(User(**doc))
        return users
    
    @staticmethod
    def validate_password_strength(password: str) -> None:
        """
        验证密码复杂度。
        要求：≥8 位，至少包含一个大写字母、一个小写字母和一个数字。
        """
        if not _PASSWORD_PATTERN.match(password):
            raise ValueError(
                "密码强度不足：至少 8 位，且必须包含大写字母、小写字母和数字"
            )

    async def create_user(self, user_create: UserCreate) -> User:
        """创建新用户"""
        # 密码强度检查
        self.validate_password_strength(user_create.password)
        
        # 检查用户名是否已存在
        existing_user = await self.get_user_by_username(user_create.username)
        if existing_user:
            raise ValueError("用户名已存在")
        
        # 检查邮箱是否已存在
        existing_email = await self.get_user_by_email(user_create.email)
        if existing_email:
            raise ValueError("邮箱已被注册")
        
        # 创建用户
        user = User(
            id=f"user-{uuid4().hex[:12]}",
            username=user_create.username,
            email=user_create.email,
            hashed_password=self.get_password_hash(user_create.password),
            full_name=user_create.full_name,
            role=UserRole.USER,
            is_active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        await self.collection().insert_one(user.model_dump())
        return user
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """验证用户"""
        user = await self.get_user_by_username(username)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        # 更新最后登录时间
        await self.collection().update_one(
            {"id": user.id},
            {"$set": {"last_login": datetime.now()}}
        )
        
        return user
    
    async def create_tokens(self, user: User) -> Token:
        """创建访问和刷新令牌"""
        token_data = {
            "sub": user.id,
            "username": user.username,
            "role": user.role.value
        }
        
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Token]:
        """刷新访问令牌"""
        token_data = self.decode_token(refresh_token)
        if not token_data:
            return None
        
        user = await self.get_user_by_id(token_data.user_id)
        if not user or not user.is_active:
            return None
        
        return await self.create_tokens(user)
    
    async def init_default_admin(self):
        """初始化默认管理员账户（密码从 DEFAULT_ADMIN_PASSWORD 环境变量读取）"""
        try:
            admin = await self.get_user_by_username("admin")
            if not admin:
                admin_password = settings.DEFAULT_ADMIN_PASSWORD
                admin_user = User(
                    id="user-admin",
                    username="admin",
                    email="admin@example.com",
                    hashed_password=self.get_password_hash(admin_password),
                    full_name="系统管理员",
                    role=UserRole.ADMIN,
                    is_active=True,
                    is_verified=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                await self.collection().insert_one(admin_user.model_dump())
                logger.info("✓ Default admin user created (username: admin)")
        except Exception as e:
            logger.warning(f"Init default admin skipped: {e}")

auth_service = AuthService()
