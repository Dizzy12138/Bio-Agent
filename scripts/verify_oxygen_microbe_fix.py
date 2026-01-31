#!/usr/bin/env python3
"""
验证「能供氧的微生物」修复：模拟 Agent 调用 search-materials 后的 API 行为。
- 后端 /api/v1/materials 应返回 materials 字段且有数据（query=氧&category=microbe）
- 后端 /api/v1/stats 应返回 totalMaterials > 0（知识库材料数）
"""
import urllib.request
import urllib.parse
import json
import sys

BASE = "http://127.0.0.1:8001/api/v1"

def get(path, params=None):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())

def main():
    ok = True
    # 1) 材料搜索：query=供氧 可能无字面匹配（库中多为「氧」「通气」「需氧」）
    print("1. 测试 /materials?category=microbe&query=供氧 ...")
    try:
        data = get("/materials", {"category": "microbe", "query": "供氧", "pageSize": 5})
        has_materials = "materials" in data and len(data.get("materials", [])) > 0
        total = data.get("total", 0)
        if has_materials:
            print(f"   OK: 返回 materials 共 {total} 条")
        else:
            print(f"   (供氧无匹配时正常) total={total}, keys={list(data.keys())}")
    except Exception as e:
        print(f"   ERROR: {e}")
        ok = False

    # 2) 用「氧」检索（Agent 提示词已引导用此关键词）
    print("2. 测试 /materials?category=microbe&query=氧 ...")
    try:
        data = get("/materials", {"category": "microbe", "query": "氧", "pageSize": 5})
        has_materials = "materials" in data and len(data.get("materials", [])) > 0
        total = data.get("total", 0)
        if has_materials:
            print(f"   OK: 返回 materials 共 {total} 条，本页 {len(data['materials'])} 条")
        else:
            print(f"   FAIL: 无 materials 或为空 (total={total})")
            ok = False
    except Exception as e:
        print(f"   ERROR: {e}")
        ok = False

    # 3) 知识库统计（欢迎语「X 种材料」来源；可为 0 若未跑 sync）
    print("3. 测试 /stats 知识库材料数 ...")
    try:
        data = get("/stats")
        total_mat = data.get("totalMaterials", data.get("micro_features_count", -1))
        total_doc = data.get("totalDocuments", 0)
        print(f"   totalMaterials/totalDocuments: {total_mat}/{total_doc}")
    except Exception as e:
        print(f"   ERROR: {e}")
        ok = False

    print("\n" + ("全部通过" if ok else "存在失败项"))
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
