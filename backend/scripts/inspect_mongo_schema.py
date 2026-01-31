#!/usr/bin/env python3
"""
直接连接 MongoDB，列出所有集合及真实文档中的字段结构（含类型与样例）。
"""
import asyncio
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

# 项目 backend 目录
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
except Exception:
    pass

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", os.getenv("MONGODB_DB", "biomedical_platform"))


def get_type_name(val):
    if val is None:
        return "null"
    if isinstance(val, bool):
        return "bool"
    if isinstance(val, int):
        return "int"
    if isinstance(val, float):
        return "float"
    if isinstance(val, str):
        return "str"
    if isinstance(val, list):
        if len(val) == 0:
            return "array"
        return "array"
    if isinstance(val, dict):
        return "object"
    return type(val).__name__


def collect_keys(doc, prefix="", result=None, types=None):
    if result is None:
        result = set()
    if types is None:
        types = defaultdict(set)
    if doc is None:
        return result, types
    if not isinstance(doc, dict):
        return result, types
    for k, v in doc.items():
        if k == "_id":
            continue
        key = f"{prefix}.{k}" if prefix else k
        result.add(key)
        types[key].add(get_type_name(v))
        if isinstance(v, dict):
            collect_keys(v, key, result, types)
        elif isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
            for i, item in enumerate(v[:2]):
                collect_keys(item, f"{key}[]", result, types)
    return result, types


async def main():
    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client[MONGODB_DB_NAME]

    try:
        names = await db.list_collection_names()
    except Exception as e:
        print(f"连接 MongoDB 失败: {e}")
        print(f"  URL: {MONGODB_URL}")
        print(f"  DB:  {MONGODB_DB_NAME}")
        client.close()
        sys.exit(1)

    names.sort()
    print(f"数据库: {MONGODB_DB_NAME}")
    print(f"集合数: {len(names)}")
    print("=" * 60)

    for cname in names:
        col = db[cname]
        total = await col.count_documents({})
        cursor = col.find({}).limit(200)
        all_keys = set()
        key_types = defaultdict(set)
        sample = {}
        n = 0
        async for doc in cursor:
            n += 1
            keys, kt = collect_keys(doc, result=set(), types=defaultdict(set))
            all_keys.update(keys)
            for k, ts in kt.items():
                key_types[k].update(ts)
            if n == 1:
                # 只保留第一条的样例（去掉 _id 便于阅读）
                sample = {k: v for k, v in doc.items() if k != "_id"}
                if isinstance(sample.get("messages"), list) and len(sample["messages"]) > 3:
                    sample["messages"] = sample["messages"][:2] + [f"... 共 {len(doc.get('messages', []))} 条"]
                if isinstance(sample.get("paper_ids"), list) and len(sample["paper_ids"]) > 5:
                    sample["paper_ids"] = sample["paper_ids"][:3] + [f"... 共 {len(doc.get('paper_ids', []))} 条"]

        # 排序输出字段
        key_list = sorted(all_keys, key=lambda x: (x.count("."), x))

        print(f"\n【{cname}】  文档数: {total}  采样: {n}")
        print("-" * 50)
        for k in key_list:
            ts = key_types.get(k, set())
            type_str = " | ".join(sorted(ts)) if ts else "?"
            print(f"  {k:<40}  {type_str}")
        if sample:
            print("  样例(首条, 部分字段):")
            for k, v in list(sample.items())[:12]:
                vstr = str(v)
                if len(vstr) > 60:
                    vstr = vstr[:57] + "..."
                print(f"    {k}: {vstr}")
        print()

    client.close()
    print("=" * 60)
    print("完成.")


if __name__ == "__main__":
    asyncio.run(main())
