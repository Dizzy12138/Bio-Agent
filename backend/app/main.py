"""
Bio-Agent Platform Backend API
集成对话记录管理系统
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("Backend service starting up...")
    
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
        # 创建对话记录索引
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
        mongodb.close()
        neo4j_db.close()
    except:
        pass
    logger.info("✓ Shutdown complete")

app = FastAPI(
    title="Bio-Agent Platform API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation Error", "detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "message": str(exc)}
    )

# 路由注册
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

@app.get("/")
async def root():
    return {"message": "Bio-Agent API", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
