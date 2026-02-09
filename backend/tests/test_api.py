"""
API 端点测试
"""

import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_root_endpoint():
    """测试根路径"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "version" in data

@pytest.mark.asyncio
async def test_health_check():
    """测试健康检查"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "services" in data

@pytest.mark.asyncio
async def test_bioextract_stats():
    """测试 BioExtract 统计接口"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/bioextract/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "delivery_systems_count" in data
        assert "micro_features_count" in data

@pytest.mark.asyncio
async def test_query_micro_features():
    """测试微生物特征查询接口"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/bioextract/micro-features",
            params={"keyword": "oxygen", "page": 1, "page_size": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

@pytest.mark.asyncio
async def test_invalid_pagination():
    """测试无效的分页参数"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 页码为 0
        response = await client.get(
            "/api/v1/bioextract/micro-features",
            params={"page": 0, "page_size": 10}
        )
        assert response.status_code == 422
        
        # 页面大小超过限制
        response = await client.get(
            "/api/v1/bioextract/micro-features",
            params={"page": 1, "page_size": 200}
        )
        assert response.status_code == 422

