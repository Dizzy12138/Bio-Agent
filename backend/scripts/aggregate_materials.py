#!/usr/bin/env python3
"""
材料聚类脚本
将 biomaterials 表中相同名称的材料合并，生成 paper_ids 数组
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import Dict, List, Any


async def aggregate_materials():
    """
    按材料名称聚类合并
    - 相同 name 的材料合并为一条记录
    - paper_id 合并为 paper_ids 数组
    - paper_title 合并为 paper_titles 数组
    - 保留第一条的 composition/functional_performance 等属性
    - 统计 paper_count
    """
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['biomedical_agent']
    
    print("=" * 60)
    print("材料聚类合并")
    print("=" * 60)
    
    # 统计原始数据
    total_before = await db['biomaterials'].count_documents({})
    print(f"原始记录数: {total_before}")
    
    # 使用 MongoDB 聚合管道按 name 分组
    pipeline = [
        {
            "$group": {
                "_id": "$name",
                "category": {"$first": "$category"},
                "subcategory": {"$first": "$subcategory"},
                # 收集所有 paper_id 和 paper_title
                "paper_ids": {"$push": "$paper_id"},
                "paper_titles": {"$push": "$paper_title"},
                # 保留第一条记录的详细信息
                "first_id": {"$first": "$id"},
                "composition": {"$first": "$composition"},
                "functional_performance": {"$first": "$functional_performance"},
                "biological_impact": {"$first": "$biological_impact"},
                "payload": {"$first": "$payload"},
                "loading_mode": {"$first": "$loading_mode"},
                "release_kinetics": {"$first": "$release_kinetics"},
                "raw_data": {"$first": "$raw_data"},
                "created_at": {"$first": "$created_at"},
                # 统计数量
                "paper_count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                "id": "$first_id",
                "name": "$_id",
                "category": 1,
                "subcategory": 1,
                "paper_ids": 1,
                "paper_titles": 1,
                "paper_count": 1,
                "composition": 1,
                "functional_performance": 1,
                "biological_impact": 1,
                "payload": 1,
                "loading_mode": 1,
                "release_kinetics": 1,
                "raw_data": 1,
                "created_at": 1,
            }
        }
    ]
    
    # 执行聚合
    print("\n正在聚类...")
    aggregated_materials = []
    async for doc in db['biomaterials'].aggregate(pipeline, allowDiskUse=True):
        # 去重 paper_ids 和 paper_titles (保持顺序)
        seen_ids = set()
        unique_paper_ids = []
        unique_paper_titles = []
        for pid, ptitle in zip(doc.get('paper_ids', []), doc.get('paper_titles', [])):
            if pid and pid not in seen_ids:
                seen_ids.add(pid)
                unique_paper_ids.append(pid)
                unique_paper_titles.append(ptitle)
        
        doc['paper_ids'] = unique_paper_ids
        doc['paper_titles'] = unique_paper_titles
        doc['paper_count'] = len(unique_paper_ids)
        doc['updated_at'] = datetime.now()
        
        aggregated_materials.append(doc)
    
    print(f"聚类后记录数: {len(aggregated_materials)}")
    
    # 统计 paper_count 分布
    count_dist = {}
    for mat in aggregated_materials:
        pc = mat['paper_count']
        if pc >= 10:
            key = "10+"
        elif pc >= 5:
            key = "5-9"
        elif pc >= 3:
            key = "3-4"
        elif pc == 2:
            key = "2"
        else:
            key = "1"
        count_dist[key] = count_dist.get(key, 0) + 1
    
    print("\n文献数量分布:")
    for key in ["1", "2", "3-4", "5-9", "10+"]:
        if key in count_dist:
            print(f"  {key} 篇文献: {count_dist[key]} 个材料")
    
    # 备份原表并替换
    print("\n正在备份原表...")
    
    # 删除旧备份（如果存在）
    try:
        await db['biomaterials_raw'].drop()
    except:
        pass
    
    # 重命名原表为备份
    await db['biomaterials'].rename('biomaterials_raw')
    
    # 写入聚类后的数据
    print("正在写入聚类数据...")
    if aggregated_materials:
        await db['biomaterials'].insert_many(aggregated_materials)
    
    # 创建索引
    await db['biomaterials'].create_index("name")
    await db['biomaterials'].create_index("category")
    await db['biomaterials'].create_index("subcategory")
    await db['biomaterials'].create_index("paper_count")
    
    # 验证
    total_after = await db['biomaterials'].count_documents({})
    print(f"\n完成! 新表记录数: {total_after}")
    
    # 显示示例
    print("\n示例 (paper_count > 5):")
    async for doc in db['biomaterials'].find({"paper_count": {"$gt": 5}}).sort("paper_count", -1).limit(5):
        print(f"  {doc['name'][:50]}: {doc['paper_count']} 篇文献")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(aggregate_materials())
