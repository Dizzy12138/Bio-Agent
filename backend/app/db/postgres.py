from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text, Column, String, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.core.config import settings

Base = declarative_base()


class Paper(Base):
    """文献表：主键 paper_id (UUID)，存储基础元数据"""
    __tablename__ = "papers"
    paper_id = Column(String(36), primary_key=True)  # UUID 字符串
    title = Column(Text)
    authors = Column(Text)
    journal = Column(Text)
    year = Column(Integer)


class BiologicalMaterial(Base):
    """生物材料表：主键 material_name，包含关联论文、功能描述与原始属性"""
    __tablename__ = "biological_materials"
    material_name = Column(String(512), primary_key=True)
    associated_papers = Column(JSONB, default=list)  # 论文 ID 数组
    paper_count = Column(Integer, default=0)
    category = Column(String(128))  # delivery_system | microbe
    functional_roles = Column(JSONB, default=dict)  # 功能角色/performance 聚合，如 functionality_notes
    attributes = Column(JSONB, default=dict)  # 原始/扩展属性：raw_data, mechanism 等

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
