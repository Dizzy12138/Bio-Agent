# Bio-Agent 启动说明

## 当前状态

- **后端 API**：已启动，运行在 `http://0.0.0.0:8001`
  - 健康检查：`http://localhost:8001/health` 返回 `{"status":"ok"}`
  - API 文档：`http://localhost:8001/docs`
- **数据库**：已通过国内镜像源拉取并启动（MongoDB 27017、Neo4j 7474/7687、PostgreSQL 5432）。若需重新启动见下方「启动数据库」。
- **前端**：需在本机安装 **Node.js 18+** 后执行下方命令启动。

## 启动前端

项目已包含 Node 20 二进制（从 npmmirror 下载），可直接使用：

```bash
export PATH="/usropt2429/node-v20.18.0-linux-x64/bin:$PATH"
cd /usropt2429/Bio-Agent
npm install   # 若已安装可跳过
npm run dev
```

- 本机访问：**http://localhost:5173**
- 局域网/公网访问：**http://本机IP:5173** 或通过端口转发 **http://公网IP:5173**（需先按下方「通过本机 IP 或公网访问」重启前端）

### 若本机已安装 Node.js 18+

```bash
cd /usropt2429/Bio-Agent
npm install
npm run dev
```

## 启动数据库

### 方式一：Docker 镜像加速后拉取并启动（推荐）

若直连 Docker Hub 超时，可先配置国内镜像源，再拉取并启动：

```bash
# 1. 配置镜像加速（需 sudo，仅需执行一次）
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.xuanyuan.me",
    "https://docker.m.daocloud.io"
  ]
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker

# 2. 拉取镜像并启动三个数据库容器
docker pull mongo:6.0
docker pull neo4j:5.15
docker pull ankane/pgvector:v0.5.1
docker run -d --name biomedical-mongo -p 27017:27017 -v mongo_data:/data/db mongo:6.0
docker run -d --name biomedical-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password -v neo4j_data:/data neo4j:5.15
docker run -d --name biomedical-postgres -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=biomedical -v postgres_data:/var/lib/postgresql/data ankane/pgvector:v0.5.1
```

### 方式二：使用 Docker Compose

```bash
cd /usropt2429/Bio-Agent
docker-compose up -d mongo neo4j postgres
```

或 Docker Compose v2：`docker compose up -d mongo neo4j postgres`

## 通过本机 IP 或公网访问前端

默认 Vite 只监听 localhost，外网或本机 IP 无法打开。项目已改为 `host: true`，**重启前端**后即可用本机 IP 或公网代理访问：

```bash
export PATH="/usropt2429/node-v20.18.0-linux-x64/bin:$PATH"
cd /usropt2429/Bio-Agent
npm run dev
```

- 本机 IP 访问：`http://192.168.x.x:5173`（将 192.168.x.x 换成你机器的局域网 IP）
- 公网访问：在路由器/云安全组做 **端口转发 5173 → 本机 5173**，然后访问 `http://公网IP:5173`

前端请求使用相对路径 `/api/v1`，会发到当前访问的域名+端口，由 Vite 代理到后端 8001，因此只要用户打开的页面地址（本机 IP 或公网 IP）能访问到本机 5173，API 也会正常。

若用 Nginx 等反向代理，建议：`/` → 本机 5173，`/api` → 本机 8001，这样用户访问 `http://公网IP/` 即可，API 为 `http://公网IP/api/...`。

## 仅重启后端

```bash
cd /usropt2429/Bio-Agent/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## 已做的修改（便于无数据库时也能启动）

- `backend/app/core/config.py`：Python 3.9 兼容（`str | None` → `Optional[str]`）
- `backend/app/db/mongo.py`：MongoDB 连接增加 `serverSelectionTimeoutMS=5000`
- `backend/app/db/neo4j.py`：Neo4j 连接增加 `connection_timeout=5`
- `backend/app/api/config.py`、`backend/app/api/skills.py`：startup 时若 DB 不可用则跳过初始化并打印日志
- `backend/app/services/config_db.py`、`backend/app/services/skill_db.py`：`init_defaults` 在异常时仅打印不抛错
