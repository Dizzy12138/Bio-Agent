#!/usr/bin/env python3
"""
数据库重建脚本
使用递送系统和微生物两个 CSV 重建 documents 和 biomaterials 表
"""

import csv
import json
import asyncio
import httpx
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

# =============================================
# 配置
# =============================================
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGODB_DB_NAME", "biomedical_platform")

# CSV 文件路径
DELIVERY_CSV = Path(__file__).parent.parent.parent / "递送系统提取_export_2026-01-27 (1).csv"
MICROBE_CSV = Path(__file__).parent.parent.parent / "微生物提取_export_2026-01-29 (1).csv"

# Markdown API
MARKDOWN_API_BASE = os.getenv("MARKDOWN_API_BASE", "http://localhost:8001/api/v1/bioextract/papers")

# 并发控制
CONCURRENT_LIMIT = 10


class DatabaseRebuilder:
    def __init__(self, dry_run: bool = False, skip_md_check: bool = False):
        self.dry_run = dry_run
        self.skip_md_check = skip_md_check
        self.client: AsyncIOMotorClient = None
        self.db = None
        self.http_client: httpx.AsyncClient = None
        
        # 统计
        self.stats = {
            "documents_total": 0,
            "documents_with_md": 0,
            "biomaterials_delivery": 0,
            "biomaterials_microbe": 0,
        }
    
    async def connect(self):
        """连接数据库和 HTTP 客户端"""
        self.client = AsyncIOMotorClient(MONGODB_URL)
        self.db = self.client[DATABASE_NAME]
        self.http_client = httpx.AsyncClient(timeout=30.0)
        print(f"Connected to MongoDB: {MONGODB_URL}/{DATABASE_NAME}")
    
    async def close(self):
        """关闭连接"""
        if self.http_client:
            await self.http_client.aclose()
        if self.client:
            self.client.close()
    
    async def check_markdown_exists(self, paper_id: str) -> Tuple[bool, str]:
        """
        检查论文 Markdown 是否存在
        返回: (exists, url)
        """
        url = f"{MARKDOWN_API_BASE}/{paper_id}/markdown"
        try:
            response = await self.http_client.head(url)
            if response.status_code == 200:
                return True, url
            return False, url
        except Exception:
            return False, url
    
    def parse_csv(self, csv_path: Path) -> List[Dict[str, Any]]:
        """解析 CSV 文件"""
        records = []
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 解析 features JSON
                features_str = row.get('features', '{}')
                try:
                    features = json.loads(features_str)
                except json.JSONDecodeError:
                    features = {}
                
                records.append({
                    "paper_id": row.get("paper_id", ""),
                    "title": row.get("title", ""),
                    "authors": row.get("authors", ""),
                    "journal": row.get("journal", ""),
                    "publish_year": int(row.get("publish_year", 0)) if row.get("publish_year", "").isdigit() else 0,
                    "features": features,
                })
        return records
    
    async def import_documents(self, delivery_records: List[Dict], microbe_records: List[Dict]):
        """
        导入文献表 (去重合并)
        """
        print("\n📚 Importing documents...")
        
        # 合并并去重
        papers: Dict[str, Dict] = {}
        
        for record in delivery_records:
            pid = record["paper_id"]
            if pid not in papers:
                papers[pid] = {
                    "paper_id": pid,
                    "title": record["title"],
                    "authors": record["authors"],
                    "journal": record["journal"],
                    "publish_year": record["publish_year"],
                    "source_tables": ["delivery"],
                    "markdown_url": None,
                    "has_markdown": False,
                    "created_at": datetime.now(),
                }
            else:
                if "delivery" not in papers[pid]["source_tables"]:
                    papers[pid]["source_tables"].append("delivery")
        
        for record in microbe_records:
            pid = record["paper_id"]
            if pid not in papers:
                papers[pid] = {
                    "paper_id": pid,
                    "title": record["title"],
                    "authors": record["authors"],
                    "journal": record["journal"],
                    "publish_year": record["publish_year"],
                    "source_tables": ["microbe"],
                    "markdown_url": None,
                    "has_markdown": False,
                    "created_at": datetime.now(),
                }
            else:
                if "microbe" not in papers[pid]["source_tables"]:
                    papers[pid]["source_tables"].append("microbe")
        
        print(f"   Unique papers: {len(papers)}")
        
        # 批量检查 Markdown 可用性 (可选跳过)
        if self.skip_md_check:
            print("   Skipping Markdown check (--skip-md-check)")
            # 设置默认 URL 模板
            for pid in papers:
                papers[pid]["markdown_url"] = f"{MARKDOWN_API_BASE}/{pid}/markdown"
        else:
            print("   Checking Markdown availability...")
            semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
            
            async def check_with_limit(paper_id: str):
                async with semaphore:
                    return paper_id, await self.check_markdown_exists(paper_id)
            
            tasks = [check_with_limit(pid) for pid in papers.keys()]
            results = await asyncio.gather(*tasks)
            
            for pid, (has_md, md_url) in results:
                papers[pid]["has_markdown"] = has_md
                papers[pid]["markdown_url"] = md_url if has_md else None
                if has_md:
                    self.stats["documents_with_md"] += 1
            
            print(f"   Papers with Markdown: {self.stats['documents_with_md']}/{len(papers)}")
        
        # 写入数据库
        if not self.dry_run:
            docs_collection = self.db["documents"]
            await docs_collection.delete_many({})  # 清空
            if papers:
                await docs_collection.insert_many(list(papers.values()))
                # 创建索引
                await docs_collection.create_index("paper_id", unique=True)
                await docs_collection.create_index("source_tables")
                await docs_collection.create_index("has_markdown")
        
        self.stats["documents_total"] = len(papers)
        print(f"   ✅ Imported {len(papers)} documents")
        
        return papers
    
    async def import_biomaterials(self, delivery_records: List[Dict], microbe_records: List[Dict]):
        """
        导入生物材料表 (按来源分类)
        """
        print("\n🧬 Importing biomaterials...")
        
        biomaterials = []
        seen_ids = set()
        
        # 处理递送系统
        print("   Processing delivery systems...")
        for record in delivery_records:
            features = record.get("features", {})
            assemblies = features.get("assemblies", [])
            
            for asm in assemblies:
                system_id = asm.get("system_id", "")
                if not system_id or system_id in seen_ids:
                    continue
                seen_ids.add(system_id)
                
                composition = asm.get("composition", {})
                func_perf = asm.get("functional_performance", {})
                bio_impact = asm.get("biological_impact_on_host", {})
                
                biomaterials.append({
                    "id": system_id,
                    "name": composition.get("material_name", system_id),
                    "category": "delivery_system",
                    "subcategory": asm.get("system_category", "unknown"),
                    "paper_id": record["paper_id"],
                    "paper_title": record["title"],
                    "composition": composition,
                    "functional_performance": func_perf,
                    "biological_impact": bio_impact,
                    "payload": composition.get("payload_name"),
                    "loading_mode": composition.get("loading_mode"),
                    "release_kinetics": func_perf.get("release_kinetics"),
                    "raw_data": asm,
                    "created_at": datetime.now(),
                })
        
        self.stats["biomaterials_delivery"] = len(biomaterials)
        print(f"   Delivery systems: {len(biomaterials)}")
        
        # 处理微生物
        print("   Processing microbes...")
        microbe_count = 0
        for record in microbe_records:
            features = record.get("features", {})
            microbes = features.get("microbes", [])
            
            for mic in microbes:
                identity = mic.get("identity", {})
                std_name = mic.get("standardized_name", "")
                if not std_name or std_name in seen_ids:
                    continue
                seen_ids.add(std_name)
                
                chassis = mic.get("chassis_and_growth", {})
                effector = mic.get("effector_modules", {})
                sensing = mic.get("sensing_modules", {})
                biosafety = mic.get("biosafety_and_containment", {})
                
                biomaterials.append({
                    "id": std_name,
                    "name": std_name,
                    "category": "microbe",
                    "subcategory": identity.get("type", "unknown"),
                    "paper_id": record["paper_id"],
                    "paper_title": record["title"],
                    "identity": identity,
                    "chassis_and_growth": chassis,
                    "effector_modules": effector,
                    "sensing_modules": sensing,
                    "biosafety": biosafety,
                    "genus": identity.get("genus"),
                    "species": identity.get("species"),
                    "strain": identity.get("strain"),
                    "is_engineered": identity.get("is_engineered"),
                    "raw_data": mic,
                    "created_at": datetime.now(),
                })
                microbe_count += 1
        
        self.stats["biomaterials_microbe"] = microbe_count
        print(f"   Microbes: {microbe_count}")
        
        # 写入数据库
        if not self.dry_run:
            bio_collection = self.db["biomaterials"]
            await bio_collection.delete_many({})
            if biomaterials:
                await bio_collection.insert_many(biomaterials)
                # 创建索引
                await bio_collection.create_index("id", unique=True)
                await bio_collection.create_index("category")
                await bio_collection.create_index("subcategory")
                await bio_collection.create_index("paper_id")
                await bio_collection.create_index("name")
        
        print(f"   ✅ Imported {len(biomaterials)} biomaterials total")
        return biomaterials
    
    async def run(self):
        """执行完整导入流程"""
        print("=" * 60)
        print("Database Rebuild")
        print("=" * 60)
        print(f"Delivery CSV: {DELIVERY_CSV}")
        print(f"Microbe CSV: {MICROBE_CSV}")
        print(f"Dry Run: {self.dry_run}")
        print()
        
        # 检查文件
        if not DELIVERY_CSV.exists():
            print(f"❌ File not found: {DELIVERY_CSV}")
            return
        if not MICROBE_CSV.exists():
            print(f"❌ File not found: {MICROBE_CSV}")
            return
        
        await self.connect()
        
        try:
            # 解析 CSV
            print("📖 Parsing CSV files...")
            delivery_records = self.parse_csv(DELIVERY_CSV)
            print(f"   Delivery: {len(delivery_records)} rows")
            
            microbe_records = self.parse_csv(MICROBE_CSV)
            print(f"   Microbe: {len(microbe_records)} rows")
            
            # 导入文献
            await self.import_documents(delivery_records, microbe_records)
            
            # 导入材料
            await self.import_biomaterials(delivery_records, microbe_records)
            
            # 打印统计
            print("\n" + "=" * 60)
            print("📊 Summary")
            print("=" * 60)
            print(f"Documents: {self.stats['documents_total']}")
            print(f"  - With Markdown: {self.stats['documents_with_md']}")
            print(f"Biomaterials: {self.stats['biomaterials_delivery'] + self.stats['biomaterials_microbe']}")
            print(f"  - Delivery Systems: {self.stats['biomaterials_delivery']}")
            print(f"  - Microbes: {self.stats['biomaterials_microbe']}")
            print()
            
        finally:
            await self.close()


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Rebuild database from CSV files")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, don't write to database")
    parser.add_argument("--skip-md-check", action="store_true", help="Skip Markdown availability check")
    args = parser.parse_args()
    
    rebuilder = DatabaseRebuilder(dry_run=args.dry_run, skip_md_check=args.skip_md_check)
    await rebuilder.run()


if __name__ == "__main__":
    asyncio.run(main())
