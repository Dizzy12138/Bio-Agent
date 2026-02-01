# MongoDB 真实数据库表结构（直接查询结果）

**数据库名**: `biomedical_platform`  
**查询时间**: 脚本 `scripts/inspect_mongo_schema.py` 直接连接 MongoDB 采样得出。

---

## 集合概览

| 集合名 | 文档数 |
|--------|--------|
| biomaterials | 39,376 |
| documents | 17,045 |
| knowledge_bases | 2 |
| llm_providers | 1 |
| paper_tags | 17,045 |

---

## 1. biomaterials

| 字段名 | 类型 |
|--------|------|
| category | str |
| name | str |
| paper_count | int |
| paper_ids | array |
| paper_titles | array |
| subcategory | str |

**样例（首条）**  
- name: Beta-cyclodextrin  
- category: delivery_system  
- subcategory: carbohydrate  
- paper_ids: [UUID, ...]  
- paper_count: 38  
- paper_titles: [标题字符串, ...]

---

## 2. documents

| 字段名 | 类型 |
|--------|------|
| authors | str |
| has_markdown | bool |
| id | str |
| journal | str |
| paper_id | str |
| publishDate | str |
| publish_year | int |
| source | str |
| source_tables | array |
| title | str |

**样例（首条）**  
- id / paper_id: 425bf5e6-6a7e-480a-b80d-cd829c84efc7  
- title: Mechanisms by which cyclodextrins modify drug release...  
- authors: Bibby, DC; Davies, NM; Tucker, IG  
- journal: INTERNATIONAL JOURNAL OF PHARMACEUTICS  
- publish_year: 2000, publishDate: "2000"  
- source: INTERNATIONAL JOURNAL OF PHARMACEUTICS  
- source_tables: ['delivery', 'microbe']  
- has_markdown: False  

---

## 3. knowledge_bases

| 字段名 | 类型 |
|--------|------|
| description | str |
| documentCount | int |
| icon | str |
| id | str |
| lastSyncAt | datetime |
| name | str |
| source | str |
| status | str |
| type | str |

**样例**  
- id: kb-pubmed  
- name: PubMed 生物医学文献库  
- type: literature, source: pubmed  
- documentCount: 35000000  
- status: active  

---

## 4. llm_providers

| 字段名 | 类型 |
|--------|------|
| apiKey | str |
| baseUrl | str |
| createdAt | datetime |
| id | str |
| isEnabled | bool |
| models | array |
| name | str |

**样例**  
- id: provider-1769856158960  
- name: Google Gemini  
- baseUrl: https://generativelanguage.googleapis.com/v1beta  
- models: ['gemini-2.5-flash', ...]  
- isEnabled: True  

---

## 5. paper_tags

| 字段名 | 类型 |
|--------|------|
| authors | str |
| journal | str |
| paper_id | str |
| title | str |
| year | int |

**样例（首条）**  
- paper_id: 425bf5e6-6a7e-480a-b80d-cd829c84efc7  
- title: Mechanisms by which cyclodextrins...  
- authors: Bibby, DC; Davies, NM; Tucker, IG  
- journal: INTERNATIONAL JOURNAL OF PHARMACEUTICS  
- year: 2000  

---

## 说明

- 当前库中**仅有以上 5 个集合**；代码里提到的 agents、prompts、mcp_configs、skills、conversations、files、ocr_tasks、assemblies、atps_records 等在本库中暂无文档（可能未初始化或使用其他库）。
- 字段类型由采样文档推断；array 表示数组，datetime 为 BSON Date。
- 再次查询可运行: `cd backend && python scripts/inspect_mongo_schema.py`
