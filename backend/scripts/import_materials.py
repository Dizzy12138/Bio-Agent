#!/usr/bin/env python3
"""
CSV 数据导入脚本 - 将递送系统文献数据导入 MongoDB

使用方法:
    cd backend
    python scripts/import_materials.py /path/to/csv_file.csv

CSV 结构:
    paper_id, title, authors, journal, publish_year, features (JSON)

features JSON 结构:
    {
        "payloads": [...],
        "materials": [{"identity": {...}, "standardized_name": "..."}],
        "assemblies": [{"system_id": "...", "composition": {...}, ...}]
    }
"""

import asyncio
import csv
import json
import sys
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGODB_DB", "biomedical_agent"))


class MaterialImporter:
    def __init__(self, mongo_uri: str, db_name: str):
        self.client = AsyncIOMotorClient(mongo_uri)
        self.db = self.client[db_name]
        self.materials_collection = self.db["materials"]
        self.documents_collection = self.db["documents"]
        self.assemblies_collection = self.db["assemblies"]
        
        # Statistics
        self.stats = {
            "papers_processed": 0,
            "materials_created": 0,
            "materials_updated": 0,
            "assemblies_created": 0,
            "errors": 0
        }

    def generate_material_id(self, name: str) -> str:
        """Generate deterministic ID from material name"""
        return hashlib.md5(name.encode()).hexdigest()[:16]

    def generate_assembly_id(self, system_id: str, paper_id: str) -> str:
        """Generate deterministic ID for assembly"""
        return hashlib.md5(f"{system_id}_{paper_id}".encode()).hexdigest()[:16]

    async def parse_and_import_row(self, row: Dict[str, str]) -> None:
        """Parse a single CSV row and import data"""
        paper_id = row.get("paper_id", "")
        title = row.get("title", "")
        authors = row.get("authors", "")
        journal = row.get("journal", "")
        publish_year = row.get("publish_year", "")
        features_str = row.get("features", "{}")
        
        if not paper_id:
            return
        
        try:
            features = json.loads(features_str) if features_str else {}
        except json.JSONDecodeError as e:
            print(f"  [ERROR] JSON parse error for paper {paper_id}: {e}")
            self.stats["errors"] += 1
            return
        
        # 1. Insert/Update document record
        doc_data = {
            "id": paper_id,
            "title": title,
            "authors": [a.strip() for a in authors.split(";")] if authors else [],
            "source": journal,
            "publishDate": f"{publish_year}-01-01" if publish_year else None,
            "type": "paper",
            "knowledgeBaseId": "kb-materials",
            "status": "indexed",
            "features": features,
            "updatedAt": datetime.now()
        }
        
        await self.documents_collection.update_one(
            {"id": paper_id},
            {"$set": doc_data, "$setOnInsert": {"createdAt": datetime.now()}},
            upsert=True
        )
        
        # 2. Process materials
        materials = features.get("materials", [])
        for mat in materials:
            await self.process_material(mat, paper_id, features.get("assemblies", []))
        
        # 3. Process assemblies
        assemblies = features.get("assemblies", [])
        for asm in assemblies:
            await self.process_assembly(asm, paper_id)
        
        self.stats["papers_processed"] += 1

    async def process_material(
        self, 
        mat_data: Dict, 
        paper_id: str, 
        assemblies: List[Dict]
    ) -> None:
        """Process and upsert a material record"""
        name = mat_data.get("standardized_name", "")
        if not name:
            return
        
        identity = mat_data.get("identity", {})
        material_id = self.generate_material_id(name)
        
        # Extract applications from assemblies that use this material
        applications = set()
        for asm in assemblies:
            composition = asm.get("composition", {})
            if composition.get("material_name") == name:
                system_category = asm.get("system_category")
                if system_category:
                    applications.add(system_category)
        
        # Prepare material document
        material_doc = {
            "id": material_id,
            "name": name,
            "category": identity.get("material_type", "unknown"),
            "subcategory": identity.get("architecture"),
            "abbreviation": identity.get("abbreviation"),
            "functional_role": identity.get("functional_role"),
            "properties": [],
            "applications": list(applications),
            "source_doc_ids": [paper_id],
            "updatedAt": datetime.now()
        }
        
        # Check if exists
        existing = await self.materials_collection.find_one({"id": material_id})
        
        if existing:
            # Merge data
            existing_doc_ids = set(existing.get("source_doc_ids", []))
            existing_doc_ids.add(paper_id)
            material_doc["source_doc_ids"] = list(existing_doc_ids)
            material_doc["paper_count"] = len(material_doc["source_doc_ids"])
            
            existing_apps = set(existing.get("applications", []))
            existing_apps.update(applications)
            material_doc["applications"] = list(existing_apps)
            
            material_doc["createdAt"] = existing.get("createdAt", datetime.now())
            
            await self.materials_collection.update_one(
                {"id": material_id},
                {"$set": material_doc}
            )
            self.stats["materials_updated"] += 1
        else:
            material_doc["createdAt"] = datetime.now()
            material_doc["paper_count"] = 1
            await self.materials_collection.insert_one(material_doc)
            self.stats["materials_created"] += 1

    async def process_assembly(self, asm_data: Dict, paper_id: str) -> None:
        """Process and insert an assembly record"""
        system_id = asm_data.get("system_id", "")
        if not system_id:
            return
        
        assembly_id = self.generate_assembly_id(system_id, paper_id)
        composition = asm_data.get("composition", {})
        functional_perf = asm_data.get("functional_performance", {})
        
        assembly_doc = {
            "id": assembly_id,
            "system_id": system_id,
            "system_category": asm_data.get("system_category", "unknown"),
            "payload_name": composition.get("payload_name"),
            "material_name": composition.get("material_name"),
            "loading_mode": composition.get("loading_mode"),
            "release_kinetics": functional_perf.get("release_kinetics"),
            "functionality_notes": functional_perf.get("functionality_notes"),
            "targeting": functional_perf.get("targeting"),
            "stimulus_responsiveness": functional_perf.get("stimulus_responsiveness"),
            "source_doc_id": paper_id,
            "metadata": asm_data,
            "createdAt": datetime.now()
        }
        
        # Upsert assembly
        await self.assemblies_collection.update_one(
            {"id": assembly_id},
            {"$set": assembly_doc},
            upsert=True
        )
        self.stats["assemblies_created"] += 1

    async def import_csv(self, csv_path: str) -> Dict[str, int]:
        """Import all data from CSV file"""
        print(f"Starting import from: {csv_path}")
        print(f"MongoDB: {MONGO_URI} / {DB_NAME}")
        print("-" * 60)
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            batch_size = 100
            batch = []
            
            for i, row in enumerate(reader):
                batch.append(row)
                
                if len(batch) >= batch_size:
                    for r in batch:
                        await self.parse_and_import_row(r)
                    batch = []
                    
                    if (i + 1) % 1000 == 0:
                        print(f"  Processed {i + 1} rows...")
            
            # Process remaining
            for r in batch:
                await self.parse_and_import_row(r)
        
        print("-" * 60)
        print("Import completed!")
        print(f"Papers processed:   {self.stats['papers_processed']}")
        print(f"Materials created:  {self.stats['materials_created']}")
        print(f"Materials updated:  {self.stats['materials_updated']}")
        print(f"Assemblies created: {self.stats['assemblies_created']}")
        print(f"Errors:             {self.stats['errors']}")
        
        return self.stats

    async def close(self):
        self.client.close()


async def main():
    if len(sys.argv) < 2:
        print("Usage: python import_materials.py <csv_file_path>")
        print("Example: python import_materials.py ../递送系统提取_export.csv")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    if not Path(csv_path).exists():
        print(f"Error: File not found: {csv_path}")
        sys.exit(1)
    
    importer = MaterialImporter(MONGO_URI, DB_NAME)
    
    try:
        await importer.import_csv(csv_path)
    finally:
        await importer.close()


if __name__ == "__main__":
    asyncio.run(main())
