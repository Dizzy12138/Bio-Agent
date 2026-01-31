# 当前 MongoDB 所有集合（表）与字段说明

数据库名默认：`biomedical_platform`（由 `MONGODB_DB_NAME` / `MONGODB_DB` 配置）。

---

## 1. `paper_tags`

**用途**：bioextract 标签/统计，按 `paper_id` 查文献元数据。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `paper_id` | string | 文献 UUID，唯一 |
| `title` | string | 标题 |
| `authors` | string | 作者（原始字符串） |
| `journal` | string | 期刊 |
| `year` | int \| null | 发表年份 |

**索引**：`paper_id`（唯一）

---

## 2. `documents`

**用途**：知识库「文献资料库」页面：列表/搜索/详情（`search_documents`、`get_document_by_id`）。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 文献 ID，与 paper_id 一致，唯一 |
| `paper_id` | string | 文献 UUID |
| `title` | string | 标题 |
| `authors` | string | 作者（原始字符串） |
| `journal` | string | 期刊 |
| `publish_year` | int \| null | 发表年份 |
| `publishDate` | string | 年份字符串，用于统计 |
| `source` | string | 来源（与 journal 一致，用于分类树） |
| `source_tables` | array of string | 来源表，如 `["delivery", "microbe"]` |
| `has_markdown` | bool | 是否有 markdown |
| `markdown_url` | string \| null | 可选，由 rebuild 等脚本写入 |

**索引**：`id`（唯一）、`publish_year`、`source`

---

## 3. `biomaterials`

**用途**：生物材料/微生物聚类，递送系统与微生物查询、知识库材料库。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `name` | string | 材料/微生物标准名 |
| `category` | string | 大类：`delivery_system` \| `microbe` |
| `subcategory` | string | 子类（如 material_type、type） |
| `paper_ids` | array of string | 关联文献 UUID 列表 |
| `paper_count` | int | 关联文献数 |
| `paper_titles` | array of string | 关联文献标题（可选） |

**索引**：`name`、`paper_ids`、`category`

---

## 4. `knowledge_bases`

**用途**：知识库列表（知识库管理）。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 知识库 ID |
| `name` | string | 名称 |
| `description` | string | 描述 |
| `type` | string | `literature` \| `database` \| `document` \| `custom` |
| `source` | string | 数据来源，如 pubmed、cnki |
| `documentCount` | int | 文献数 |
| `lastSyncAt` | datetime | 最后同步时间 |
| `status` | string | `active` \| `syncing` \| `error` \| `offline` |
| `icon` | string \| null | 图标 |
| `metadata` | object \| null | 扩展元数据 |

---

## 5. `assemblies`

**用途**：组装体数据（若使用 import_materials 等脚本会写入）。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| （结构以 knowledge_db / import_materials 实际写入为准，一般为组装体 ID、组成、关联材料等） |

---

## 6. `agents`

**用途**：专家/Agent 配置。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | Agent ID |
| `name` | string | 名称 |
| `description` | string | 描述 |
| `avatar` | string \| null | 头像/图标 |
| `systemPrompt` | string | 系统提示词 |
| `modelProviderId` | string | 关联 LLM 提供商 ID |
| `model` | string | 模型名 |
| `temperature` | float | 温度 |
| `tools` | array of string | 启用的工具列表 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

---

## 7. `llm_providers`

**用途**：LLM 提供商配置。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 提供商 ID |
| `name` | string | 名称 |
| `baseUrl` | string | API 基础 URL |
| `apiKey` | string \| null | API Key |
| `models` | array of string | 模型列表 |
| `isEnabled` | bool | 是否启用 |
| `createdAt` | datetime | 创建时间 |

---

## 8. `prompts`

**用途**：提示词模板。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 模板 ID |
| `key` | string | 唯一 key/slug |
| `name` | string | 名称 |
| `content` | string | 内容 |
| `variables` | array of string | 变量名列表 |
| `createdAt` | datetime | 创建时间 |

---

## 9. `mcp_configs`

**用途**：MCP 服务配置。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 配置 ID |
| `name` | string | 名称 |
| `command` | string | 命令 |
| `args` | array of string | 参数 |
| `env` | object | 环境变量 |
| `isEnabled` | bool | 是否启用 |
| `createdAt` | datetime | 创建时间 |

---

## 10. `skills`

**用途**：技能/工具配置（含 MCP、API、原生技能）。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 技能 ID |
| `name` | string | 名称 |
| `description` | string | 描述 |
| `type` | string | `mcp` \| `api` \| `native` |
| `source` | string | 来源说明 |
| `schema_definition` | object | 参数 JSON Schema |
| `executionConfig` | object | 含 requiresApproval、mcpServerId 等 |
| `enabled` | bool | 是否启用 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

---

## 11. `conversations`

**用途**：对话会话与消息。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 会话 ID |
| `title` | string | 标题 |
| `expertId` | string \| null | 关联专家 ID |
| `messages` | array | 消息列表，每项含 id、role、content、metadata、createdAt |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

---

## 12. `files`

**用途**：上传文件记录。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 文件 UUID |
| `filename` | string | 文件名 |
| `originalName` | string | 原始文件名 |
| `contentType` | string | MIME 类型 |
| `size` | int | 大小（字节） |
| `path` | string | 本地路径 |
| `md5` | string \| null | 可选 |
| `createdAt` | datetime | 创建时间 |
| `uploadedBy` | string \| null | 上传者 |

---

## 13. `ocr_tasks`

**用途**：OCR 任务状态与结果。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 任务 ID |
| `fileId` | string | 关联文件 ID |
| `status` | string | `pending` \| `processing` \| `completed` \| `failed` |
| `progress` | int | 进度 0–100 |
| `error` | string \| null | 错误信息 |
| `result` | object \| null | 结果数据 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |
| `options` | object \| null | MinerU 等选项 |

---

## 其他可能存在的集合（脚本/历史）

- **`atps_records`**：bioextract_db 中定义，ATPS 相关记录。
- **`delivery_systems`** / **`micro_features`**：旧版 import_bioextract_data 使用；当前递送/微生物数据已统一在 `biomaterials`（按 category 区分）。
- **`materials`** / **`assemblies`**：import_materials 等脚本可能写入；若未使用该导入流程，可能为空或不存在。

---

## 集合与代码位置对照

| 集合名 | 写入/初始化 | 读取 |
|--------|-------------|------|
| paper_tags | sync_and_aggregate.py | bioextract_db.py |
| documents | sync_and_aggregate.py, rebuild_database.py, import_documents.py | knowledge_db.py, api/knowledge.py |
| biomaterials | sync_and_aggregate.py, rebuild_database.py | knowledge_db.py, bioextract_db.py, api/knowledge.py |
| knowledge_bases | knowledge_db.py init_defaults | knowledge_db.py |
| assemblies | import_materials.py | knowledge_db.py |
| agents | config_db.py init_defaults | config_db.py |
| llm_providers | config_db.py init_defaults | config_db.py |
| prompts | config_db.py | config_db.py |
| mcp_configs | config_db.py | config_db.py |
| skills | skill_db.py init_defaults | skill_db.py |
| conversations | chat_db.py | chat_db.py |
| files | api/files.py | api/files.py |
| ocr_tasks | api/files.py | api/files.py |
