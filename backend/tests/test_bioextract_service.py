"""
BioExtract 服务测试
"""

import pytest
from app.services.bioextract_db import bioextract_service
from app.models.bioextract import MicroFeatQueryParams, DeliveryQueryParams

@pytest.mark.asyncio
async def test_get_stats():
    """测试获取统计信息"""
    stats = await bioextract_service.get_stats()
    
    assert stats.delivery_systems_count >= 0
    assert stats.micro_features_count >= 0
    assert stats.paper_tags_count >= 0
    assert stats.atps_records_count >= 0
    assert stats.last_updated is not None

@pytest.mark.asyncio
async def test_query_micro_features_with_keyword():
    """测试关键词查询微生物特征"""
    params = MicroFeatQueryParams(
        keyword="oxygen",
        page=1,
        page_size=10
    )
    
    result = await bioextract_service.query_micro_features(params)
    
    assert result.total >= 0
    assert len(result.items) <= 10
    assert result.page == 1
    assert result.page_size == 10

@pytest.mark.asyncio
async def test_query_delivery_systems():
    """测试查询递送系统"""
    params = DeliveryQueryParams(
        page=1,
        page_size=20
    )
    
    result = await bioextract_service.query_delivery_systems(params)
    
    assert result.total >= 0
    assert len(result.items) <= 20
    assert result.page == 1

@pytest.mark.asyncio
async def test_filter_atps():
    """测试 ATPS 过滤"""
    # 初始化默认数据
    await bioextract_service.init_defaults()
    
    # 查询 PEG
    records = await bioextract_service.filter_atps("PEG")
    
    assert len(records) >= 0
    for record in records:
        assert "PEG" in [record.polymer1, record.polymer2]

@pytest.mark.asyncio
async def test_get_delivery_carrier_types():
    """测试获取载体类型"""
    types = await bioextract_service.get_delivery_carrier_types()
    
    assert isinstance(types, list)
    for item in types:
        assert "carrier_type" in item
        assert "count" in item
        assert item["count"] > 0

@pytest.mark.asyncio
async def test_get_micro_system_types():
    """测试获取微生物系统类型"""
    types = await bioextract_service.get_micro_system_types()
    
    assert isinstance(types, list)
    for item in types:
        assert "system_type" in item
        assert "count" in item

