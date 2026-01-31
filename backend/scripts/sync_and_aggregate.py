#!/usr/bin/env python3
"""
同步与聚类脚本：从递送系统、微生物 CSV 提取数据，
写入 PostgreSQL (papers, biological_materials) 与 MongoDB。

- Papers: 去重后写入 Postgres papers、MongoDB paper_tags、MongoDB documents（source=extracted_only, has_markdown=false）。
- Materials: 按 standardized_name 聚合，保留 functional_performance、biological_impact、raw_data，写入 Postgres biological_materials、MongoDB biomaterials。
- Idempotent: 可重复执行；单行 JSON 解析失败仅记录并继续。
"""

import asyncio
import csv
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Set, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)
JSON_PARSE_ERRORS: List[str] = []

# 项目根目录
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

# CSV 路径（支持通配或默认文件名）
DELIVERY_GLOB = "递送系统提取_export_*.csv"
MICROBE_GLOB = "微生物提取_export_*.csv"

# 默认文件名（与 rebuild_database.py 一致）
DELIVERY_DEFAULT = PROJECT_ROOT / "递送系统提取_export_2026-01-27 (1).csv"
MICROBE_DEFAULT = PROJECT_ROOT / "微生物提取_export_2026-01-29 (1).csv"


def find_csv(glob_pattern: str, default_path: Path) -> Optional[Path]:
    """在项目根目录查找 CSV，找不到则用 default_path（若存在）"""
    for f in PROJECT_ROOT.glob(glob_pattern):
        return f
    return default_path if default_path.exists() else None


def load_csv_rows(path: Path) -> List[Dict[str, str]]:
    """加载 CSV，返回行列表；features 列保持为字符串由调用方 json.loads"""
    rows = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def _merge_functional(dst: Dict[str, Any], src: Dict[str, Any]) -> None:
    """Merge src into dst: concatenate string values (e.g. functionality_notes), keep first for non-strings."""
    if not src:
        return
    for k, v in src.items():
        if v is None or v == "":
            continue
        if isinstance(v, dict):
            if k not in dst:
                dst[k] = dict(v)
            continue
        if k not in dst:
            dst[k] = v
        elif isinstance(v, str) and isinstance(dst[k], str):
            dst[k] = dst[k] + "; " + v


# material_map value: dict with paper_ids, category, subcategory, functional_performance, biological_impact, raw_data
MaterialEntry = Dict[str, Any]


def extract_papers_and_materials(
    delivery_rows: List[Dict[str, str]],
    microbe_rows: List[Dict[str, str]],
) -> Tuple[Dict[str, Dict], Dict[str, MaterialEntry]]:
    """
    从两套 CSV 中提取论文与材料；单行 JSON 解析失败仅记录并继续。
    material_map 每项含: paper_ids(set), category, subcategory, functional_performance(dict), biological_impact(dict), raw_data(dict).
    """
    global JSON_PARSE_ERRORS
    JSON_PARSE_ERRORS = []
    paper_map: Dict[str, Dict[str, Any]] = {}
    material_map: Dict[str, MaterialEntry] = {}

    def ensure_material(name: str, category: str, subcategory: Optional[str]) -> MaterialEntry:
        if name not in material_map:
            material_map[name] = {
                "paper_ids": set(),
                "category": category,
                "subcategory": subcategory or "",
                "functional_performance": {},
                "biological_impact": {},
                "raw_data": {},
            }
        return material_map[name]

    def process_delivery_row(row: Dict[str, str]) -> None:
        paper_id = (row.get("paper_id") or "").strip()
        if not paper_id:
            return
        paper_map[paper_id] = {
            "paper_id": paper_id,
            "title": (row.get("title") or "").strip(),
            "authors": (row.get("authors") or "").strip(),
            "journal": (row.get("journal") or "").strip(),
            "year": int(y) if (y := (row.get("publish_year") or "").strip()).isdigit() else None,
        }
        features_str = row.get("features") or "{}"
        try:
            features = json.loads(features_str)
        except json.JSONDecodeError as e:
            JSON_PARSE_ERRORS.append(f"delivery paper_id={paper_id}: {e}")
            return
        # Materials list: link paper to material names
        for m in features.get("materials") or []:
            name = (m.get("standardized_name") or "").strip()
            if not name:
                continue
            identity = m.get("identity") or {}
            sub = (identity.get("material_type") or "").strip() or None
            ent = ensure_material(name, "delivery_system", sub)
            ent["paper_ids"].add(paper_id)
        # Assemblies: collect functional_performance, biological_impact per material_name
        for asm in features.get("assemblies") or []:
            comp = asm.get("composition") or {}
            mat_name = (comp.get("material_name") or "").strip()
            if not mat_name:
                continue
            ent = ensure_material(mat_name, "delivery_system", None)
            ent["paper_ids"].add(paper_id)
            fp = asm.get("functional_performance") or {}
            if fp:
                _merge_functional(ent["functional_performance"], fp)
            bio = asm.get("biological_impact_on_host") or {}
            if bio:
                _merge_functional(ent["biological_impact"], bio)
            if not ent["raw_data"] and asm.get("payload_material_interaction"):
                ent["raw_data"] = asm.get("payload_material_interaction") or {}

    def process_microbe_row(row: Dict[str, str]) -> None:
        paper_id = (row.get("paper_id") or "").strip()
        if not paper_id:
            return
        paper_map[paper_id] = {
            "paper_id": paper_id,
            "title": (row.get("title") or "").strip(),
            "authors": (row.get("authors") or "").strip(),
            "journal": (row.get("journal") or "").strip(),
            "year": int(y) if (y := (row.get("publish_year") or "").strip()).isdigit() else None,
        }
        features_str = row.get("features") or "{}"
        try:
            features = json.loads(features_str)
        except json.JSONDecodeError as e:
            JSON_PARSE_ERRORS.append(f"microbe paper_id={paper_id}: {e}")
            return
        for m in features.get("microbes") or []:
            name = (m.get("standardized_name") or "").strip()
            if not name:
                continue
            identity = m.get("identity") or {}
            sub = (identity.get("type") or "").strip() or None
            ent = ensure_material(name, "microbe", sub)
            ent["paper_ids"].add(paper_id)
            # Store full microbe as raw_data for search (E_B_has_oxygenation, description, etc.)
            ent["raw_data"] = dict(m)
            # Optional: pull functionality from therapeutic_mechanisms etc.
            for tm in (m.get("effector_modules") or {}).get("therapeutic_mechanisms") or []:
                notes = (tm or {}).get("mechanism_notes")
                if notes:
                    _merge_functional(ent["functional_performance"], {"functionality_notes": notes})

    for row in delivery_rows:
        process_delivery_row(row)
    for row in microbe_rows:
        process_microbe_row(row)

    return paper_map, material_map


async def ensure_pg_tables(engine):
    """确保 PostgreSQL 表存在，并补齐 biological_materials 的 functional_roles/attributes 列"""
    from sqlalchemy import text
    from app.db.postgres import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_pg_columns(conn)
    print("[PostgreSQL] Tables papers & biological_materials ensured.")


async def _ensure_pg_columns(conn) -> None:
    """Add functional_roles and attributes if missing (idempotent)."""
    from sqlalchemy import text
    for col in ("functional_roles", "attributes"):
        try:
            await conn.execute(text(
                "ALTER TABLE biological_materials ADD COLUMN IF NOT EXISTS "
                + col + " JSONB DEFAULT '{}'::jsonb"
            ))
        except Exception:
            pass


async def write_postgres(
    engine,
    paper_map: Dict[str, Dict],
    material_map: Dict[str, MaterialEntry],
):
    """批量写入 PostgreSQL：papers ON CONFLICT DO NOTHING，biological_materials ON CONFLICT DO UPDATE（含 functional_roles, attributes）"""
    from sqlalchemy import text

    async with engine.begin() as conn:
        # 1) 批量插入 papers
        papers_data = list(paper_map.values())
        if papers_data:
            stmt = text("""
                INSERT INTO papers (paper_id, title, authors, journal, year)
                VALUES (:paper_id, :title, :authors, :journal, :year)
                ON CONFLICT (paper_id) DO NOTHING
            """)
            for p in papers_data:
                await conn.execute(
                    stmt,
                    {
                        "paper_id": p["paper_id"],
                        "title": p.get("title") or "",
                        "authors": p.get("authors") or "",
                        "journal": p.get("journal") or "",
                        "year": p.get("year"),
                    },
                )
        print(f"[PostgreSQL] Papers: {len(papers_data)} rows (inserted/ignored by conflict).")

        # 2) 批量 upsert biological_materials（含 functional_roles, attributes）
        stmt_mat = text("""
            INSERT INTO biological_materials (material_name, associated_papers, paper_count, category, functional_roles, attributes)
            VALUES (:material_name, CAST(:associated_papers AS jsonb), :paper_count, :category, CAST(:functional_roles AS jsonb), CAST(:attributes AS jsonb))
            ON CONFLICT (material_name) DO UPDATE SET
                associated_papers = EXCLUDED.associated_papers,
                paper_count = EXCLUDED.paper_count,
                category = EXCLUDED.category,
                functional_roles = EXCLUDED.functional_roles,
                attributes = EXCLUDED.attributes
        """)
        for name, ent in material_map.items():
            paper_list = list(ent["paper_ids"])
            await conn.execute(
                stmt_mat,
                {
                    "material_name": name[:512],
                    "associated_papers": json.dumps(paper_list),
                    "paper_count": len(paper_list),
                    "category": ent["category"],
                    "functional_roles": json.dumps(ent.get("functional_performance") or {}),
                    "attributes": json.dumps(ent.get("raw_data") or {}),
                },
            )
    print(f"[PostgreSQL] Biological materials: {len(material_map)} rows upserted.")


async def ensure_mongo_indexes(mongodb):
    """MongoDB：paper_tags 唯一索引 paper_id；documents 供知识库文献资料库(id/publish_year/source)；biomaterials 索引"""
    db = mongodb.db
    await db["paper_tags"].create_index("paper_id", unique=True)
    # 知识库「文献资料库」页面读的是 documents 集合，需 id 唯一、publish_year 排序、source 分类
    await db["documents"].create_index("id", unique=True)
    await db["documents"].create_index("publish_year")
    await db["documents"].create_index("source")
    await db["biomaterials"].create_index("name")
    await db["biomaterials"].create_index("paper_ids")
    await db["biomaterials"].create_index("category")
    print("[MongoDB] Indexes: paper_tags(paper_id), documents(id, publish_year, source), biomaterials(name, paper_ids, category).")


async def write_mongo_paper_tags(mongodb, paper_map: Dict[str, Dict]):
    """清空并 Upsert paper_tags（bioextract 标签/统计用），与 CSV 一致"""
    col = mongodb.db["paper_tags"]
    await col.delete_many({})
    if not paper_map:
        print("[MongoDB] paper_tags: 0 documents.")
        return
    docs = []
    for p in paper_map.values():
        docs.append({
            "paper_id": p["paper_id"],
            "title": p.get("title") or "",
            "authors": p.get("authors") or "",
            "journal": p.get("journal") or "",
            "year": p.get("year"),
        })
    await col.insert_many(docs)
    print(f"[MongoDB] paper_tags: {len(docs)} documents.")


async def write_mongo_documents(mongodb, paper_map: Dict[str, Dict]):
    """写入 documents 集合，供知识库「文献资料库」页面展示；source=extracted_only, has_markdown=false"""
    col = mongodb.db["documents"]
    await col.delete_many({})
    if not paper_map:
        print("[MongoDB] documents: 0 documents.")
        return
    docs = []
    for p in paper_map.values():
        year = p.get("year")
        journal = p.get("journal") or ""
        docs.append({
            "id": p["paper_id"],
            "paper_id": p["paper_id"],
            "title": p.get("title") or "",
            "authors": p.get("authors") or "",
            "journal": journal,
            "publish_year": year,
            "publishDate": str(year) if year is not None else "",
            "source": "extracted_only",
            "source_tables": ["delivery", "microbe"],
            "has_markdown": False,
        })
    await col.insert_many(docs)
    print(f"[MongoDB] documents: {len(docs)} documents (source=extracted_only, for 文献资料库).")


async def write_mongo_biomaterials(
    mongodb,
    paper_map: Dict[str, Dict],
    material_map: Dict[str, MaterialEntry],
):
    """将聚合后的材料写入 biomaterials：name, category, subcategory, paper_ids, paper_count, paper_titles, functional_performance, biological_impact, raw_data"""
    col = mongodb.db["biomaterials"]
    await col.delete_many({"category": {"$in": ["delivery_system", "microbe"]}})
    docs = []
    for name, ent in material_map.items():
        paper_list = list(ent["paper_ids"])
        paper_titles = [paper_map.get(pid, {}).get("title") or "" for pid in paper_list]
        raw_data = ent.get("raw_data") or {}
        functional_performance = ent.get("functional_performance") or {}
        biological_impact = ent.get("biological_impact") or {}
        # 转为字符串便于 keyword 正则搜索（截断以防超 16MB）
        raw_data_str = json.dumps(raw_data, ensure_ascii=False)[:50000] if raw_data else ""
        functional_performance_str = json.dumps(functional_performance, ensure_ascii=False)[:30000] if functional_performance else ""
        docs.append({
            "name": name,
            "category": ent["category"],
            "subcategory": ent.get("subcategory") or "",
            "paper_ids": paper_list,
            "paper_count": len(paper_list),
            "paper_titles": paper_titles,
            "functional_performance": functional_performance,
            "biological_impact": biological_impact,
            "raw_data": raw_data,
            "raw_data_str": raw_data_str,
            "functional_performance_str": functional_performance_str,
        })
    if docs:
        await col.insert_many(docs)
    print(f"[MongoDB] biomaterials: {len(docs)} documents (delivery_system + microbe, with functional/raw).")


async def main():
    import os
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")

    delivery_path = find_csv(DELIVERY_GLOB, DELIVERY_DEFAULT)
    microbe_path = find_csv(MICROBE_GLOB, MICROBE_DEFAULT)
    if not delivery_path or not microbe_path:
        print("ERROR: 未找到递送系统或微生物 CSV。")
        print(f"  递送: {delivery_path or DELIVERY_DEFAULT}")
        print(f"  微生物: {microbe_path or MICROBE_DEFAULT}")
        sys.exit(1)

    print("Loading CSVs...")
    delivery_rows = load_csv_rows(delivery_path)
    microbe_rows = load_csv_rows(microbe_path)
    print(f"  递送系统: {len(delivery_rows)} 行")
    print(f"  微生物: {len(microbe_rows)} 行")

    print("Extracting papers and materials...")
    paper_map, material_map = extract_papers_and_materials(delivery_rows, microbe_rows)
    papers_count = len(paper_map)
    materials_count = len(material_map)
    print(f"  去重文献: {papers_count}")
    print(f"  聚合材料/微生物名: {materials_count}")
    if JSON_PARSE_ERRORS:
        log.warning(f"  JSON 解析失败行数: {len(JSON_PARSE_ERRORS)} (已跳过)")
        for e in JSON_PARSE_ERRORS[:5]:
            log.warning(f"    {e}")
        if len(JSON_PARSE_ERRORS) > 5:
            log.warning(f"    ... 共 {len(JSON_PARSE_ERRORS)} 条")

    # PostgreSQL
    postgres_url = os.getenv("POSTGRES_URL", "postgresql://user:password@localhost:5432/biomedical")
    if postgres_url.startswith("postgresql://"):
        postgres_url = postgres_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine(postgres_url, echo=False)
    try:
        await ensure_pg_tables(engine)
        await write_postgres(engine, paper_map, material_map)
    finally:
        await engine.dispose()

    # MongoDB
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB_NAME", os.getenv("MONGODB_DB", "biomedical_platform"))
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    mongodb = type("MongoDB", (), {"db": client[db_name]})()
    try:
        await ensure_mongo_indexes(mongodb)
        await write_mongo_paper_tags(mongodb, paper_map)
        await write_mongo_documents(mongodb, paper_map)
        await write_mongo_biomaterials(mongodb, paper_map, material_map)
    finally:
        client.close()

    print("")
    print("========== 汇总 ==========")
    print(f"  文献总数（去重）: {papers_count}")
    print(f"  材料/微生物名总数（聚合）: {materials_count}")
    print("==========================")


if __name__ == "__main__":
    asyncio.run(main())
