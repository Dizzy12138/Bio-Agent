#!/usr/bin/env python3
"""
BioExtract 数据导入脚本

将前端 CSV/XLSX 数据文件导入 MongoDB

使用方法:
    cd backend
    python scripts/import_bioextract_data.py [--dry-run]

数据源:
    - delivery-qwen.csv → delivery_systems collection
    - micro_feat.csv → micro_features collection
    - tag.csv → paper_tags collection
"""

import asyncio
import csv
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

MONGO_URI = os.getenv("MONGODB_URL", os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGODB_DB", "biomedical_platform"))

# 数据文件路径（相对于项目根目录）
DATA_DIR = Path(__file__).parent.parent.parent / "src" / "features" / "bioextract" / "data"


class BioExtractImporter:
    """BioExtract 数据导入器"""
    
    def __init__(self, mongo_uri: str, db_name: str, dry_run: bool = False):
        self.client = AsyncIOMotorClient(mongo_uri)
        self.db = self.client[db_name]
        self.dry_run = dry_run
        
        # 集合
        self.delivery_collection = self.db["delivery_systems"]
        self.micro_collection = self.db["micro_features"]
        self.tags_collection = self.db["paper_tags"]
        
        # 统计
        self.stats = {
            "delivery_imported": 0,
            "micro_imported": 0,
            "tags_imported": 0,
            "errors": 0,
        }
    
    async def import_delivery_qwen(self, csv_path: Path) -> int:
        """
        导入递送系统数据 (delivery-qwen.csv)
        
        约 82 列数据
        """
        print(f"\n📦 Importing delivery-qwen.csv...")
        print(f"   Source: {csv_path}")
        
        if not csv_path.exists():
            print(f"   ❌ File not found!")
            return 0
        
        # 读取并解析 CSV
        documents = []
        try:
            with open(csv_path, 'r', encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                
                # 检查是否空文件
                if not reader.fieldnames:
                    print(f"   ❌ Empty file!")
                    return 0
                
                # 修复 Header: 去除 " (中文说明)"
                # "paper_id (论文ID)" -> "paper_id"
                original_fields = reader.fieldnames
                cleaned_fields = [f.split(' (')[0].strip() for f in original_fields]
                reader.fieldnames = cleaned_fields
                    
                print(f"   Columns: {len(reader.fieldnames)}")
                
                for row in reader:
                    # 过滤空行或无效行
                    if not any(row.values()):
                        continue
                    
                    if not row.get('paper_id'):
                        continue

                    # 构建文档
                    doc = {}
                    for key, value in row.items():
                        if not key: continue
                        
                        val = value.strip() if value else None
                        
                        # 数值字段转换
                        if key == 'system_index':
                            doc[key] = int(val) if val and val.isdigit() else 0
                        elif key.endswith('_tokens'):
                            doc[key] = int(val) if val and val.isdigit() else 0
                        else:
                            doc[key] = val
                    
                    documents.append(doc)

        except Exception as e:
            print(f"   ❌ Error parsing CSV: {e}")
            return 0
        
        print(f"   Parsed: {len(documents)} records")
        
        if self.dry_run:
            print(f"   🔍 Dry run - skipping insert")
            return len(documents)
        
        # 清空旧数据并批量插入
        try:
            await self.delivery_collection.delete_many({})
            
            if documents:
                batch_size = 1000
                for i in range(0, len(documents), batch_size):
                    batch = documents[i:i + batch_size]
                    await self.delivery_collection.insert_many(batch)
                    print(f"   Inserted batch: {i + len(batch)}/{len(documents)}")
            
            self.stats["delivery_imported"] = len(documents)
            print(f"   ✅ Imported {len(documents)} delivery systems")
            return len(documents)
        except Exception as e:
            print(f"   ❌ MongoDB Error: {e}")
            self.stats["errors"] += 1
            return 0
    
    async def import_micro_feat(self, csv_path: Path) -> int:
        """
        导入微生物特征数据 (micro_feat.csv)
        
        约 72 列数据
        """
        print(f"\n🦠 Importing micro_feat.csv...")
        print(f"   Source: {csv_path}")
        
        if not csv_path.exists():
            print(f"   ❌ File not found!")
            return 0
        
        documents = []
        try:
            with open(csv_path, 'r', encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                
                # 检查是否空文件
                if not reader.fieldnames:
                    print(f"   ❌ Empty file!")
                    return 0
                
                # 修复 Header: "system_index (系统序号)" -> "system_index"
                original_fields = reader.fieldnames
                cleaned_fields = [f.split(' (')[0].strip() for f in original_fields]
                reader.fieldnames = cleaned_fields
                
                print(f"   Columns: {len(reader.fieldnames)}")
                
                for row in reader:
                    if not row.get('paper_id'):
                        continue
                        
                    doc = {}
                    for key, value in row.items():
                        if not key: continue
                        val = value.strip() if value else None
                        
                        if key == 'system_index':
                            doc[key] = int(val) if val and val.isdigit() else 0
                        elif key.endswith('_tokens'):
                            doc[key] = int(val) if val and val.isdigit() else 0
                        else:
                            doc[key] = val
                            
                    documents.append(doc)
        except Exception as e:
            print(f"   ❌ Error parsing CSV: {e}")
            return 0
        
        print(f"   Parsed: {len(documents)} records")
        
        if self.dry_run:
            print(f"   🔍 Dry run - skipping insert")
            return len(documents)
        
        try:
            await self.micro_collection.delete_many({})
            
            if documents:
                batch_size = 1000
                for i in range(0, len(documents), batch_size):
                    batch = documents[i:i + batch_size]
                    await self.micro_collection.insert_many(batch)
                    print(f"   Inserted batch: {i + len(batch)}/{len(documents)}")
            
            self.stats["micro_imported"] = len(documents)
            print(f"   ✅ Imported {len(documents)} micro features")
            return len(documents)
        except Exception as e:
            print(f"   ❌ MongoDB Error: {e}")
            self.stats["errors"] += 1
            return 0
    
    async def import_tags(self, csv_path: Path) -> int:
        """
        导入论文标签数据 (tag.csv)
        """
        print(f"\n🏷️  Importing tag.csv...")
        print(f"   Source: {csv_path}")
        
        if not csv_path.exists():
            print(f"   ❌ File not found!")
            return 0
        
        # 这个文件可能很大(~66MB)
        file_size = csv_path.stat().st_size / (1024 * 1024)
        print(f"   File size: {file_size:.2f} MB")
        
        documents = []
        seen_paper_ids = set()
        
        try:
            with open(csv_path, 'r', encoding='utf-8-sig', newline='') as f:
                # 显式增加 field limit 防止大字段报错
                csv.field_size_limit(sys.maxsize)
                
                reader = csv.DictReader(f)
                
                print(f"   Columns: {len(reader.fieldnames) if reader.fieldnames else 0}")
                
                for row in reader:
                    paper_id = row.get('paper_id', '').strip()
                    if not paper_id:
                        continue
                        
                    if paper_id in seen_paper_ids:
                        continue
                    seen_paper_ids.add(paper_id)
                    
                    # 清理数据
                    doc = {k: v.strip() if v else None for k, v in row.items() if k}
                    documents.append(doc)
                    
        except Exception as e:
            print(f"   ❌ Error parsing CSV: {e}")
            return 0
        
        print(f"   Parsed: {len(documents)} unique records")
        
        if self.dry_run:
            print(f"   🔍 Dry run - skipping insert")
            return len(documents)
        
        try:
            await self.tags_collection.delete_many({})
            
            if documents:
                batch_size = 5000
                for i in range(0, len(documents), batch_size):
                    batch = documents[i:i + batch_size]
                    await self.tags_collection.insert_many(batch)
                    print(f"   Inserted batch: {i + len(batch)}/{len(documents)}")
            
            # 创建索引
            await self.tags_collection.create_index("paper_id", unique=True)
            await self.tags_collection.create_index("l1")
            await self.tags_collection.create_index("l2")
            print(f"   Created indexes on paper_id, l1, l2")
            
            self.stats["tags_imported"] = len(documents)
            print(f"   ✅ Imported {len(documents)} paper tags")
            return len(documents)
        except Exception as e:
            print(f"   ❌ MongoDB Error: {e}")
            self.stats["errors"] += 1
            return 0
    
    async def run(self):
        """执行全部导入"""
        print("=" * 60)
        print("BioExtract Data Import")
        print("=" * 60)
        print(f"MongoDB: {MONGO_URI}")
        print(f"Database: {DB_NAME}")
        print(f"Data Dir: {DATA_DIR}")
        print(f"Dry Run: {self.dry_run}")
        
        # 导入各数据集
        await self.import_delivery_qwen(DATA_DIR / "delivery-qwen.csv")
        await self.import_micro_feat(DATA_DIR / "micro_feat.csv")
        await self.import_tags(DATA_DIR / "tag.csv")
        
        # 打印统计
        print("\n" + "=" * 60)
        print("Import Summary")
        print("=" * 60)
        print(f"Delivery Systems: {self.stats['delivery_imported']}")
        print(f"Micro Features:   {self.stats['micro_imported']}")
        print(f"Paper Tags:       {self.stats['tags_imported']}")
        print(f"Errors:           {self.stats['errors']}")
        
        total = sum([
            self.stats['delivery_imported'],
            self.stats['micro_imported'],
            self.stats['tags_imported'],
        ])
        print(f"\nTotal Records: {total}")
        
        if self.dry_run:
            print("\n⚠️  This was a dry run. No data was actually imported.")
        else:
            print("\n✅ Import completed successfully!")
    
    async def close(self):
        self.client.close()


async def main():
    parser = argparse.ArgumentParser(description="Import BioExtract data to MongoDB")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse files and show statistics without importing"
    )
    args = parser.parse_args()
    
    importer = BioExtractImporter(MONGO_URI, DB_NAME, dry_run=args.dry_run)
    
    try:
        await importer.run()
    finally:
        await importer.close()


if __name__ == "__main__":
    asyncio.run(main())
