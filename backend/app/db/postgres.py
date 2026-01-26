from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text
from app.core.config import settings

Base = declarative_base()

class PostgresDB:
    engine = None
    session_factory = None

    def connect(self):
        # Ensure async driver is used in URL (postgresql:// -> postgresql+asyncpg://)
        url = settings.POSTGRES_URL
        if url.startswith("postgresql://"):
             url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        self.engine = create_async_engine(url, echo=False)
        self.session_factory = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )
        print("Connected to PostgreSQL")

    async def init_extensions(self):
        # Enable pgvector extension
        async with self.engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)
            print("PostgreSQL extensions and tables initialized")

    async def get_session(self) -> AsyncSession:
        async with self.session_factory() as session:
            yield session
            
    async def close(self):
        if self.engine:
            await self.engine.dispose()
            print("Closed PostgreSQL connection")

pg_db = PostgresDB()
