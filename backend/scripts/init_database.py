#!/usr/bin/env python3
"""
Bio-Agent 数据库初始化脚本

将递送系统和微生物 CSV 数据导入 MongoDB

使用方法:
    cd backend
    python scripts/init_database.py [--dry-run] [--skip-md-check]

数据源:
    - 递送系统提取_export_2026-01-27 (1).csv → biomaterials collection (category: delivery_system)
    - 微生物提取_export_2026-01-29 (1).csv → biomaterials collection (category: microbe)
    → documents collection (去重合并的论文信息)
"""

import csv
import json
import asyncio
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# =============================================
# 配置
# =============================================
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGODB_DB_NAME", "biomedical_platform")

# CSV 文件路径 (相对于项目根目录)
PROJECT_ROOT = Path(__file__).parent.parent.parent
DELIVERY_CSV = PROJECT_ROOT / "递送系统提取_export_2026-01-27 (1).csv"
MICROBE_CSV = PROJECT_ROOT / "微生物提取_export_2026-01-29 (1).csv"


class DatabaseInitializer:
    """数据库初始化器"""
    
    def __init__(self, mongo_uri: str, db_name: str, dry_run: bool = False):
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.dry_run = dry_run
        self.client = None
        self.db = None
        
        # 统计
        self.stats = {
            "documents_total": 0,
            "biomaterials_delivery": 0,
            "biomaterials_microbe": 0,
            "errors": 0,
        }
    
    async def connect(self):
        """连接 MongoDB"""
        self.client = AsyncIOMotorClient(self.mongo_uri)
        self.db = self.client[self.db_name]
        print(f"✓ Connected to MongoDB: {self.mongo_uri}")
        print(f"  Database: {self.db_name}")
    
    async def close(self):
        """关闭连接"""
        if self.client:
            self.client.close()
    
    def parse_csv(self, csv_path: Path) -> List[Dict[str, Any]]:
        """解析 CSV 文件"""
        records = []
        
        # 增加字段大小限制，防止大 JSON 字段报错
        csv.field_size_limit(sys.maxsize)
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 解析 features JSON (第6列)
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
    
    async def create_indexes(self):
        """创建数据库索引（为所有集合创建必要索引）"""
        print("\n📊 Creating indexes for all collections...")
        
        if self.dry_run:
            print("   Skipped (dry run)")
            return
        
        # =============================================
        # 核心业务数据表
        # =============================================
        
        # documents collection - 论文文献
        docs = self.db["documents"]
        await docs.create_index("paper_id", unique=True)
        await docs.create_index("source_tables")
        await docs.create_index([("title", "text"), ("authors", "text")])
        print("   ✓ documents")
        
        # biomaterials collection - 生物材料
        bio = self.db["biomaterials"]
        await bio.create_index("id", unique=True)
        await bio.create_index("category")
        await bio.create_index("subcategory")
        await bio.create_index("paper_id")
        await bio.create_index("name")
        await bio.create_index([("name", "text"), ("paper_titles", "text")])
        print("   ✓ biomaterials")
        
        # paper_tags collection - 论文标签
        tags = self.db["paper_tags"]
        await tags.create_index("paper_id", unique=True)
        await tags.create_index("l1")
        await tags.create_index("l2")
        await tags.create_index("classification")
        print("   ✓ paper_tags")
        
        # atps_records collection - ATPS 记录
        atps = self.db["atps_records"]
        await atps.create_index("polymer1")
        await atps.create_index("polymer2")
        await atps.create_index([("polymer1", 1), ("polymer2", 1)])
        print("   ✓ atps_records")
        
        # assemblies collection - 组装体
        assemblies = self.db["assemblies"]
        await assemblies.create_index("system_id", unique=True)
        await assemblies.create_index("category")
        await assemblies.create_index("paper_id")
        print("   ✓ assemblies")
        
        # =============================================
        # 用户与认证
        # =============================================
        
        # users collection - 用户
        users = self.db["users"]
        await users.create_index("username", unique=True)
        await users.create_index("email", unique=True)
        await users.create_index("role")
        await users.create_index("is_active")
        print("   ✓ users")
        
        # =============================================
        # 对话管理
        # =============================================
        
        # conversations collection - 对话
        convos = self.db["conversations"]
        await convos.create_index("id", unique=True)
        await convos.create_index("user_id")
        await convos.create_index("created_at")
        await convos.create_index("updated_at")
        await convos.create_index([("user_id", 1), ("created_at", -1)])
        await convos.create_index([("user_id", 1), ("updated_at", -1)])
        print("   ✓ conversations")
        
        # messages collection - 消息
        msgs = self.db["messages"]
        await msgs.create_index("id", unique=True)
        await msgs.create_index("conversation_id")
        await msgs.create_index("timestamp")
        await msgs.create_index([("conversation_id", 1), ("timestamp", 1)])
        print("   ✓ messages")
        
        # =============================================
        # Agent 与 LLM 配置
        # =============================================
        
        # agents collection - Agent 配置
        agents = self.db["agents"]
        await agents.create_index("id", unique=True)
        await agents.create_index("name")
        await agents.create_index("is_active")
        await agents.create_index("created_at")
        print("   ✓ agents")
        
        # llm_providers collection - LLM 提供商
        providers = self.db["llm_providers"]
        await providers.create_index("id", unique=True)
        await providers.create_index("name")
        await providers.create_index("provider_type")
        await providers.create_index("is_active")
        print("   ✓ llm_providers")
        
        # prompts collection - 提示词模板
        prompts = self.db["prompts"]
        await prompts.create_index("id", unique=True)
        await prompts.create_index("name")
        await prompts.create_index("category")
        await prompts.create_index("is_active")
        print("   ✓ prompts")
        
        # =============================================
        # MCP 配置
        # =============================================
        
        # mcp_configs collection - MCP 全局配置
        mcp_configs = self.db["mcp_configs"]
        await mcp_configs.create_index("id", unique=True)
        await mcp_configs.create_index("name")
        print("   ✓ mcp_configs")
        
        # mcp_servers collection - MCP 服务器
        mcp_servers = self.db["mcp_servers"]
        await mcp_servers.create_index("id", unique=True)
        await mcp_servers.create_index("name")
        await mcp_servers.create_index("is_active")
        print("   ✓ mcp_servers")
        
        # mcp_tools collection - MCP 工具
        mcp_tools = self.db["mcp_tools"]
        await mcp_tools.create_index("id", unique=True)
        await mcp_tools.create_index("server_id")
        await mcp_tools.create_index("name")
        await mcp_tools.create_index("is_enabled")
        print("   ✓ mcp_tools")
        
        # =============================================
        # 知识库与技能
        # =============================================
        
        # knowledge_bases collection - 知识库
        kb = self.db["knowledge_bases"]
        await kb.create_index("id", unique=True)
        await kb.create_index("name")
        await kb.create_index("category")
        await kb.create_index("created_at")
        print("   ✓ knowledge_bases")
        
        # skills collection - 技能
        skills = self.db["skills"]
        await skills.create_index("id", unique=True)
        await skills.create_index("name")
        await skills.create_index("category")
        await skills.create_index("is_active")
        print("   ✓ skills")
        
        # =============================================
        # 文件与任务
        # =============================================
        
        # files collection - 文件存储
        files = self.db["files"]
        await files.create_index("id", unique=True)
        await files.create_index("filename")
        await files.create_index("user_id")
        await files.create_index("created_at")
        print("   ✓ files")
        
        # ocr_tasks collection - OCR 任务
        ocr = self.db["ocr_tasks"]
        await ocr.create_index("id", unique=True)
        await ocr.create_index("file_id")
        await ocr.create_index("status")
        await ocr.create_index("created_at")
        print("   ✓ ocr_tasks")
        
        # playground_sessions collection - Playground 会话
        playground = self.db["playground_sessions"]
        await playground.create_index("id", unique=True)
        await playground.create_index("user_id")
        await playground.create_index("created_at")
        print("   ✓ playground_sessions")
        
        print("\n   ✓ All 18 collections initialized with indexes")
    
    async def import_documents(self, delivery_records: List[Dict], microbe_records: List[Dict]):
        """导入文献表 (去重合并)"""
        print("\n📚 Importing documents...")
        
        # 合并并去重
        papers: Dict[str, Dict] = {}
        
        for record in delivery_records:
            pid = record["paper_id"]
            if not pid:
                continue
            if pid not in papers:
                papers[pid] = {
                    "paper_id": pid,
                    "title": record["title"],
                    "authors": record["authors"],
                    "journal": record["journal"],
                    "publish_year": record["publish_year"],
                    "source_tables": ["delivery"],
                    "created_at": datetime.now(),
                }
            else:
                if "delivery" not in papers[pid]["source_tables"]:
                    papers[pid]["source_tables"].append("delivery")
        
        for record in microbe_records:
            pid = record["paper_id"]
            if not pid:
                continue
            if pid not in papers:
                papers[pid] = {
                    "paper_id": pid,
                    "title": record["title"],
                    "authors": record["authors"],
                    "journal": record["journal"],
                    "publish_year": record["publish_year"],
                    "source_tables": ["microbe"],
                    "created_at": datetime.now(),
                }
            else:
                if "microbe" not in papers[pid]["source_tables"]:
                    papers[pid]["source_tables"].append("microbe")
        
        print(f"   Unique papers: {len(papers)}")
        
        if not self.dry_run and papers:
            docs_collection = self.db["documents"]
            await docs_collection.delete_many({})
            
            # 批量插入
            batch_size = 1000
            paper_list = list(papers.values())
            for i in range(0, len(paper_list), batch_size):
                batch = paper_list[i:i + batch_size]
                await docs_collection.insert_many(batch)
                print(f"   Inserted batch: {i + len(batch)}/{len(paper_list)}")
        
        self.stats["documents_total"] = len(papers)
        print(f"   ✓ Imported {len(papers)} documents")
        return papers
    
    async def import_biomaterials(self, delivery_records: List[Dict], microbe_records: List[Dict]):
        """导入生物材料表"""
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
                    "paper_titles": [record["title"]],
                    "source_doc_ids": [record["paper_id"]],
                    "paper_count": 1,
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
                    "paper_titles": [record["title"]],
                    "source_doc_ids": [record["paper_id"]],
                    "paper_count": 1,
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
        if not self.dry_run and biomaterials:
            bio_collection = self.db["biomaterials"]
            await bio_collection.delete_many({})
            
            batch_size = 1000
            for i in range(0, len(biomaterials), batch_size):
                batch = biomaterials[i:i + batch_size]
                await bio_collection.insert_many(batch)
                print(f"   Inserted batch: {i + len(batch)}/{len(biomaterials)}")
        
        total = self.stats["biomaterials_delivery"] + self.stats["biomaterials_microbe"]
        print(f"   ✓ Imported {total} biomaterials total")
        return biomaterials
    
    async def create_default_admin(self):
        """创建默认管理员用户"""
        print("\n👤 Creating default admin user...")
        
        if self.dry_run:
            print("   Skipped (dry run)")
            return
        
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        users = self.db["users"]
        existing = await users.find_one({"username": "admin"})
        
        if existing:
            print("   Admin user already exists, skipping")
            return
        
        admin_user = {
            "id": "admin-001",
            "username": "admin",
            "email": "admin@example.com",
            "hashed_password": pwd_context.hash("admin123"),
            "full_name": "系统管理员",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(),
        }
        
        await users.insert_one(admin_user)
        print("   ✓ Default admin created (username: admin, password: admin123)")
        print("   ⚠️  请在生产环境中立即修改默认密码!")
    
    async def run(self):
        """执行完整初始化流程"""
        print("=" * 60)
        print("Bio-Agent Database Initialization")
        print("=" * 60)
        print(f"MongoDB: {self.mongo_uri}")
        print(f"Database: {self.db_name}")
        print(f"Dry Run: {self.dry_run}")
        print()
        
        # 检查 CSV 文件
        print("📁 Checking data files...")
        if not DELIVERY_CSV.exists():
            print(f"   ⚠️  Delivery CSV not found: {DELIVERY_CSV}")
            print("   Skipping delivery data import")
            delivery_records = []
        else:
            print(f"   ✓ Delivery CSV: {DELIVERY_CSV.stat().st_size / (1024*1024):.1f} MB")
            delivery_records = self.parse_csv(DELIVERY_CSV)
            print(f"     Parsed: {len(delivery_records)} rows")
        
        if not MICROBE_CSV.exists():
            print(f"   ⚠️  Microbe CSV not found: {MICROBE_CSV}")
            print("   Skipping microbe data import")
            microbe_records = []
        else:
            print(f"   ✓ Microbe CSV: {MICROBE_CSV.stat().st_size / (1024*1024):.1f} MB")
            microbe_records = self.parse_csv(MICROBE_CSV)
            print(f"     Parsed: {len(microbe_records)} rows")
        
        await self.connect()
        
        try:
            # 导入数据
            if delivery_records or microbe_records:
                await self.import_documents(delivery_records, microbe_records)
                await self.import_biomaterials(delivery_records, microbe_records)
            
            # 创建索引
            await self.create_indexes()
            
            # 创建默认管理员
            await self.create_default_admin()
            
            # 打印统计
            print("\n" + "=" * 60)
            print("📊 Summary")
            print("=" * 60)
            print(f"Documents:        {self.stats['documents_total']}")
            print(f"Biomaterials:     {self.stats['biomaterials_delivery'] + self.stats['biomaterials_microbe']}")
            print(f"  - Delivery:     {self.stats['biomaterials_delivery']}")
            print(f"  - Microbes:     {self.stats['biomaterials_microbe']}")
            print()
            
            if self.dry_run:
                print("⚠️  This was a dry run. No data was actually written.")
            else:
                print("✅ Database initialization completed successfully!")
            
        finally:
            await self.close()


async def main():
    parser = argparse.ArgumentParser(description="Initialize Bio-Agent database")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse files and show statistics without importing"
    )
    args = parser.parse_args()
    
    initializer = DatabaseInitializer(MONGODB_URL, DATABASE_NAME, dry_run=args.dry_run)
    await initializer.run()


if __name__ == "__main__":
    asyncio.run(main())
