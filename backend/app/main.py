from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Backend service starting up...")
    from app.db.mongo import mongodb
    from app.db.neo4j import neo4j_db
    from app.services.llm import llm_service
    
    try:
        await llm_service.start()
    except Exception as e:
        print(f"Error: LLMService initialization failed: {e}")

    try:
        mongodb.connect()
        print("MongoDB initialized.")
    except Exception as e:
        print(f"Error: MongoDB connection failed: {e}")
        # In production/docker, we might want to fail hard, but for now log error
        
    try:
        neo4j_db.connect()
        print("Neo4j initialized.")
    except Exception as e:
        print(f"Error: Neo4j connection failed: {e}")

    try:
        from app.db.postgres import pg_db
        pg_db.connect()
        await pg_db.init_extensions()
        print("PostgreSQL initialized.")
    except Exception as e:
        print(f"Error: PostgreSQL connection failed: {e}")
    
    yield
    # Shutdown
    try:
        await llm_service.stop()
    except Exception as e:
        print(f"Error: LLMService shutdown failed: {e}")

    try:
        mongodb.close()
    except: pass
    
    try:
        neo4j_db.close()
    except: pass

    try:
        await pg_db.close()
    except: pass
    print("Backend service shutting down...")

from app.api import knowledge

app = FastAPI(
    title="Biomedical Agent Platform API",
    description="Backend service for Biomedical Agent Platform supporting Chat, Knowledge Base, and BioExtract features.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge.router, prefix="/api/v1", tags=["Knowledge"])


from app.api import chat
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])

from app.api import config
app.include_router(config.router, prefix="/api/v1", tags=["System Config"])

from app.api import skills
app.include_router(skills.router, prefix="/api/v1", tags=["Skills Management"])

from app.api import files
app.include_router(files.router, prefix="/api/v1", tags=["Files & OCR"])

from app.api import bioextract
app.include_router(bioextract.router, prefix="/api/v1", tags=["BioExtract-AI"])

@app.get("/")
async def root():
    return {"message": "Welcome to Biomedical Agent Platform API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
