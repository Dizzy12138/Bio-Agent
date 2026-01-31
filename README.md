# BioMedical Agent Platform (BioExtract-AI)

这是一个集成了知识图谱、文献分析和智能代理的生物医学研究辅助平台。平台利用大语言模型 (LLM) 和 MCP (Model Context Protocol) 协议，帮助研究人员从海量文献中提取生物材料、递送系统和微结构信息。

## 🚀 主要特性

- **BioExtract-AI 智能代理**: 
  - 基于 ReAct 模式的智能助手，支持多步推理和工具调用
  - 集成多种 LLM 支持 (OpenAI, Gemini, Claude, DeepSeek)
  - 通过 MCP 协议调用后端知识库和计算工具
- **多模态知识库**:
  - **文档库 (MongoDB)**: 存储文献元数据和全文解析内容
  - **知识图谱 (Neo4j)**: 存储生物实体关系（材料-应用-性能）
  - **向量库 (PostgreSQL/pgvector)**: 支持语义检索 (RAG)
- **精准文献处理**:
  - 集成 MinerU/OCR 工具提取 PDF 内容
  - 支持 Markdown 格式的论文全文分析
- **可视化交互**:
  - 交互式对话界面
  - 动态图表展示 (Recharts)
  - 知识图谱可视化

## 🛠️ 技术栈

### Frontend (前端)
- **Framework**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS, Radix UI, Lucide Icons
- **State Management**: Zustand
- **Visualization**: Recharts, React-Markdown
- **Agent Protocol**: MCP (Model Context Protocol) client implementation

### Backend (后端)
- **Framework**: Python FastAPI
- **Database**:
  - **MongoDB**: 主要数据存储 (Documents, Materials)
  - **Neo4j**: 知识图谱存储 (Relationships)
  - **PostgreSQL**: 向量存储 (Embeddings)
- **AI Integration**: LangChain, LLM API Clients

## 🏁 快速开始 (本地开发)

### 前置要求
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose (用于启动数据库)

### 1. 启动基础服务 (Databases)

使用 Docker Compose 启动 MongoDB, Neo4j 和 PostgreSQL：

```bash
docker-compose up -d mongo neo4j postgres
```

### 2. 启动后端 API

```bash
cd backend

# 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务 (默认端口 8001)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

API 文档地址: [http://localhost:8001/docs](http://localhost:8001/docs)

### 3. 启动前端应用

```bash
# 回到项目根目录
npm install

# 启动开发服务器
npm run dev
```

前端访问地址: [http://localhost:5173](http://localhost:5173)

## 🐳 Docker 部署 (后端全栈)

如果你想通过 Docker 运行完整的后端服务（包含 API 和数据库）：

```bash
# 构建并启动所有服务
docker-compose up -d --build
```

这将启动：
- `backend`: FastAPI 服务 (Port 8001)
- `mongo`: MongoDB (Port 27017)
- `neo4j`: Neo4j (Port 7474/7687)
- `postgres`: PostgreSQL (Port 5432)

## ⚙️ 配置说明

### 环境变量

前端默认连接到 `http://localhost:8001/api/v1`。如需修改，请在前端根目录创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://your-backend-ip:8001/api/v1
```

### LLM 模型配置

平台支持多种 LLM 提供商。请在 Web 界面的 **设置 (Settings)** 页面配置：
- **Provider**: OpenAI / Gemini / Claude / DeepSeek / Local
- **API Key**: 你的 API 密钥
- **Model**: 选择的模型 (如 gpt-4o, gemini-1.5-pro)

## 📁 目录结构

```
.
├── backend/                 # Python FastAPI 后端
│   ├── app/                 # 应用代码
│   │   ├── api/             # API 路由
│   │   ├── core/            # 核心配置
│   │   ├── models/          # Pydantic 模型
│   │   └── services/        # 业务逻辑 (MongoDB/Neo4j 交互)
│   ├── Dockerfile           # 后端镜像构建文件
│   └── requirements.txt     # Python 依赖
├── src/                     # React 前端
│   ├── features/            # 功能模块
│   │   ├── bioextract/      # 生物提取 Agent 核心逻辑
│   │   ├── chat/            # 聊天界面组件
│   │   ├── knowledge/       # 知识库管理
│   │   └── playground/      # 实验性功能 (OCR 等)
│   └── components/          # 通用组件
├── docker-compose.yml       # Docker编排文件
└── README.md                # 项目文档
```

## 📝 最近更新

- **BioExtract-AI 重构**: 从本地 SQLite 迁移至 MongoDB 后端 API，支持更高效的数据检索。
- **搜索增强**: 扩展了材料搜索功能，支持通过论文标题和功能描述（如 "oxygen-generating"）反查微生物。
- **配置管理**: 统一了 LLM 配置管理，支持后端加密存储 API Key。
