"""
应用配置管理
使用 pydantic-settings 从环境变量加载配置
"""

from pydantic_settings import BaseSettings
from typing import Optional, List
import os
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """应用配置类"""
    
    # =============================================
    # 应用基础配置
    # =============================================
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production-please-use-strong-random-string"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    
    # =============================================
    # 数据库配置
    # =============================================
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "biomedical_platform"
    MONGODB_MAX_POOL_SIZE: int = 10
    MONGODB_MIN_POOL_SIZE: int = 1
    
    # Neo4j - 修复密码
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"  # 修改为实际密码
    NEO4J_MAX_CONNECTION_LIFETIME: int = 3600
    
    # PostgreSQL
    POSTGRES_URL: str = "postgresql://bioagent:bioagent2024@localhost:5432/biomedical"
    POSTGRES_POOL_SIZE: int = 5
    POSTGRES_MAX_OVERFLOW: int = 10
    
    # =============================================
    # LLM API Keys (可选)
    # =============================================
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    
    # =============================================
    # 外部服务
    # =============================================
    PAPER_API_BASE_URL: str = "http://140.206.138.45:8000"
    PAPER_API_TOKEN: Optional[str] = None
    
    # =============================================
    # 日志配置
    # =============================================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    LOG_MAX_BYTES: int = 10485760  # 10MB
    LOG_BACKUP_COUNT: int = 5
    
    # =============================================
    # 安全配置
    # =============================================
    API_KEY_ENCRYPTION_KEY: Optional[str] = None
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # =============================================
    # 开发环境专用
    # =============================================
    ENABLE_DOCS: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    def is_production(self) -> bool:
        """判断是否为生产环境"""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """判断是否为开发环境"""
        return self.ENVIRONMENT.lower() == "development"
    
    def get_allowed_origins(self) -> List[str]:
        """获取允许的CORS源列表"""
        if self.ALLOWED_ORIGINS:
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        if self.is_production():
            logger.warning("ALLOWED_ORIGINS not set in production — defaulting to empty list")
            return []
        return ["*"]
    
    def validate_for_production(self) -> None:
        """
        生产环境启动前安全检查。
        若关键配置仍为默认值，抛出 RuntimeError 阻止启动。
        """
        if not self.is_production():
            return
        
        errors: List[str] = []
        
        default_secrets = [
            "change-me-in-production-please-use-strong-random-string",
            "your-secret-key-change-in-production",
        ]
        if self.SECRET_KEY in default_secrets or len(self.SECRET_KEY) < 32:
            errors.append(
                "SECRET_KEY must be a strong random string (≥32 chars) — "
                "do not use the default value in production"
            )
        
        if self.DEFAULT_ADMIN_PASSWORD == "admin123":
            errors.append(
                "DEFAULT_ADMIN_PASSWORD must be changed from 'admin123' in production — "
                "set the DEFAULT_ADMIN_PASSWORD environment variable"
            )
        
        if self.DEBUG:
            errors.append("DEBUG must be False in production")
        
        if errors:
            msg = "Production security checks failed:\n" + "\n".join(f"  • {e}" for e in errors)
            raise RuntimeError(msg)


# 创建全局配置实例
settings = Settings()
