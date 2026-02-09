"""
Pytest 配置和 Fixtures
"""

import pytest
import asyncio
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db() -> AsyncGenerator:
    """测试数据库 Fixture"""
    # 使用测试数据库
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client["biomedical_platform_test"]
    
    yield db
    
    # 清理测试数据
    await client.drop_database("biomedical_platform_test")
    client.close()

@pytest.fixture
def mock_llm_config():
    """Mock LLM 配置"""
    return {
        "provider": "openai",
        "apiKey": "sk-test-key",
        "model": "gpt-3.5-turbo",
        "baseUrl": "https://api.openai.com/v1"
    }

