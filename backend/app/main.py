"""
Bio-Agent Platform Backend API
商业级安全加固版本
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from typing import Dict, Any
import logging
import logging.handlers
import os

from app.core.config import settings

# =============================================
# 结构化日志配置
# =============================================
def _setup_logging():
    """配置结构化日志系统（JSON 格式 + 轮转文件）"""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    formatter = logging.Formatter(
        '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    # 控制台输出
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 文件轮转输出
    log_dir = os.path.dirname(settings.LOG_FILE)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
    file_handler = logging.handlers.RotatingFileHandler(
        settings.LOG_FILE,
        maxBytes=settings.LOG_MAX_BYTES,
        backupCount=settings.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

_setup_logging()
logger = logging.getLogger(__name__)


# =============================================
# 应用生命周期
# =============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("Backend service starting up...")

    # 生产环境安全检查 — 不通过则直接拒绝启动
    settings.validate_for_production()

    from app.db.mongo import mongodb
    from app.db.neo4j import neo4j_db
    from app.services.llm import llm_service
    from app.services.auth_service import auth_service
    from app.services.skill_db import skill_service
    from app.services.conversation_service import conversation_service

    try:
        await llm_service.start()
        logger.info("✓ LLMService initialized")
    except Exception as e:
        logger.error(f"✗ LLMService failed: {e}")

    try:
        mongodb.connect()
        logger.info("✓ MongoDB connected")
        await auth_service.init_default_admin()
        await skill_service.init_defaults()
        await conversation_service._ensure_indexes()
        logger.info("✓ Conversation indexes created")
    except Exception as e:
        logger.error(f"✗ MongoDB failed: {e}")

    try:
        neo4j_db.connect()
        logger.info("✓ Neo4j connected")
    except Exception as e:
        logger.warning(f"⊘ Neo4j skipped: {e}")

    logger.info("✓ Backend service ready")

    yield

    logger.info("Backend service shutting down...")
    try:
        await llm_service.stop()
    except Exception as e:
        logger.warning(f"LLMService stop error: {e}")
    try:
        mongodb.close()
    except Exception as e:
        logger.warning(f"MongoDB close error: {e}")
    try:
        neo4j_db.close()
    except Exception as e:
        logger.warning(f"Neo4j close error: {e}")
    logger.info("✓ Shutdown complete")


# =============================================
# FastAPI 应用
# =============================================
app = FastAPI(
    title="Bio-Agent Platform API",
    version="2.0.0",
    lifespan=lifespan,
    # 生产环境自动禁用 Swagger/ReDoc
    docs_url="/docs" if not settings.is_production() else None,
    redoc_url="/redoc" if not settings.is_production() else None,
)

# =============================================
# 中间件注册（注意：先注册的后执行）
# =============================================

# 1) CORS — 使用配置的允许源
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2) 速率限制
from app.middleware.rate_limit import setup_rate_limiting
setup_rate_limiting(app)


# =============================================
# 请求体大小限制中间件
# =============================================
MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024  # 10 MB

@app.middleware("http")
async def limit_request_body_size(request: Request, call_next):
    """拒绝超过 10 MB 的请求体"""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"error": "Request body too large", "max_bytes": MAX_REQUEST_BODY_BYTES},
        )
    return await call_next(request)


# =============================================
# 全局异常处理
# =============================================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation Error", "detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    # 生产环境不暴露内部错误信息
    message = "Internal Server Error" if settings.is_production() else str(exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "message": message}
    )


# =============================================
# 路由注册
# =============================================
from app.api import knowledge, chat, config, skills, files, bioextract, neo4j, auth, mcp, playground, users, admin

app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1", tags=["Users"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(knowledge.router, prefix="/api/v1", tags=["Knowledge"])
app.include_router(config.router, prefix="/api/v1", tags=["Config"])
app.include_router(skills.router, prefix="/api/v1", tags=["Skills"])
app.include_router(files.router, prefix="/api/v1", tags=["Files"])
app.include_router(bioextract.router, prefix="/api/v1", tags=["BioExtract"])
app.include_router(neo4j.router, prefix="/api/v1", tags=["Neo4j"])
app.include_router(mcp.router, prefix="/api/v1", tags=["MCP"])
app.include_router(playground.router, prefix="/api/v1", tags=["Playground"])


# =============================================
# 根路径 & 健康检查
# =============================================
@app.get("/")
async def root():
    return {
        "message": "Bio-Agent API",
        "version": "2.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }

@app.get("/health")
async def health():
    """
    深度健康检查 — 检测各数据库的真实连接状态。
    任何依赖不可达时返回 503 + degraded 状态。
    """
    from app.db.mongo import mongodb
    from app.db.neo4j import neo4j_db

    checks: Dict[str, str] = {}
    overall = True

    # MongoDB
    try:
        await mongodb.db.command("ping")
        checks["mongodb"] = "healthy"
    except Exception as e:
        checks["mongodb"] = f"unhealthy: {e}" if not settings.is_production() else "unhealthy"
        overall = False

    # Neo4j
    try:
        session = neo4j_db.get_session()
        session.run("RETURN 1").single()
        session.close()
        checks["neo4j"] = "healthy"
    except Exception as e:
        checks["neo4j"] = f"unhealthy: {e}" if not settings.is_production() else "unhealthy"
        overall = False

    status_code = 200 if overall else 503
    return JSONResponse(
        content={
            "status": "healthy" if overall else "degraded",
            "services": checks,
        },
        status_code=status_code,
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
