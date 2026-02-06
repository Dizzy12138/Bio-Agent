-- PostgreSQL 初始化脚本
-- 创建扩展和表结构

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建 papers 表
CREATE TABLE IF NOT EXISTS papers (
    paper_id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT,
    journal VARCHAR(255),
    year INTEGER,
    abstract TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_papers_title ON papers USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year DESC);
CREATE INDEX IF NOT EXISTS idx_papers_journal ON papers(journal);

-- 创建 biological_materials 表
CREATE TABLE IF NOT EXISTS biological_materials (
    material_name VARCHAR(512) PRIMARY KEY,
    associated_papers JSONB,
    paper_count INTEGER DEFAULT 0,
    category VARCHAR(50),
    functional_roles JSONB,
    attributes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_materials_category ON biological_materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_paper_count ON biological_materials(paper_count DESC);

-- 创建 embeddings 表（用于向量检索）
CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,  -- 'paper', 'material', etc.
    embedding vector(1536),  -- OpenAI embedding 维度
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建向量索引（HNSW 算法，性能更好）
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_id, entity_type);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加更新时间触发器
CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON biological_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 授予权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bioagent;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bioagent;

-- 完成
SELECT 'PostgreSQL initialization completed' AS status;

