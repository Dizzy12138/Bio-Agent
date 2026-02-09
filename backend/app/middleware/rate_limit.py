"""
速率限制中间件
基于 slowapi 实现全局 & 端点级速率限制
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# 默认按 IP 提取
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    enabled=settings.RATE_LIMIT_ENABLED,
    storage_uri="memory://",
)


def setup_rate_limiting(app):
    """
    将速率限制中间件绑定到 FastAPI 应用。
    在 main.py 中调用。
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    logger.info(f"✓ Rate limiting enabled ({settings.RATE_LIMIT_PER_MINUTE}/min)")
