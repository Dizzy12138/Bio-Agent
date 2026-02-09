#!/bin/bash
# ============================================
# Bio-Agent 快速启动脚本
# ============================================
# 
# 使用方法:
#   chmod +x start.sh
#   ./start.sh              # 启动前后端服务
#   ./start.sh --init       # 初始化数据库后启动
#   ./start.sh --backend    # 仅启动后端
#   ./start.sh --frontend   # 仅启动前端
#   ./start.sh --docker     # 使用 Docker Compose 启动
#
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 is not installed"
        exit 1
    fi
    log_success "Python3: $(python3 --version)"
    
    # Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm: $(npm --version)"
}

# 检查 MongoDB 连接
check_mongodb() {
    log_info "Checking MongoDB connection..."
    
    cd "$BACKEND_DIR"
    
    # 尝试连接 MongoDB
    if python3 -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
async def check():
    try:
        client = AsyncIOMotorClient('mongodb://localhost:27017', serverSelectionTimeoutMS=3000)
        await client.admin.command('ping')
        print('ok')
    except Exception as e:
        print(f'error: {e}')
asyncio.run(check())
" 2>/dev/null | grep -q "ok"; then
        log_success "MongoDB is running"
        return 0
    else
        log_warn "MongoDB is not running or not accessible"
        return 1
    fi
}

# 初始化数据库
init_database() {
    log_info "Initializing database..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # 运行初始化脚本
    python3 scripts/init_database.py
    
    log_success "Database initialized"
}

# 计算最优 worker 数
get_workers() {
    local cpus=$(nproc 2>/dev/null || echo 2)
    local workers=$((cpus > 4 ? 4 : cpus < 2 ? 2 : cpus))
    echo $workers
}

# 启动后端
start_backend() {
    log_info "Starting backend server..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # 安装依赖 (如果需要)
    if [ ! -d "venv" ]; then
        log_info "Creating virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    fi
    
    local WORKERS=$(get_workers)
    
    # 启动服务 (多 worker + 连接优化)
    log_info "Backend running on http://localhost:8001 (workers: $WORKERS)"
    python -m uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8001 \
        --workers "$WORKERS" \
        --timeout-keep-alive 30 \
        --limit-concurrency 100 \
        --log-level info
}

# 启动前端
start_frontend() {
    log_info "Starting frontend server..."
    
    cd "$FRONTEND_DIR"
    
    # 安装依赖 (如果需要)
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
    fi
    
    # 启动服务
    log_info "Frontend running on http://localhost:5173"
    npm run dev
}

# 启动全部服务 (前后端)
start_all() {
    log_info "Starting Bio-Agent Platform..."
    
    # 检查依赖
    check_dependencies
    
    # 先清理残留进程
    cleanup_stale_processes
    
    # 启动后端 (后台)
    log_info "Starting backend in background..."
    cd "$BACKEND_DIR"
    
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    local WORKERS=$(get_workers)
    
    nohup python -m uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8001 \
        --workers "$WORKERS" \
        --timeout-keep-alive 30 \
        --limit-concurrency 100 \
        --log-level info \
        > "$PROJECT_ROOT/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PROJECT_ROOT/.backend.pid"
    
    log_success "Backend started (PID: $BACKEND_PID, workers: $WORKERS)"
    log_info "Backend logs: $PROJECT_ROOT/backend.log"
    
    # 等待后端启动
    sleep 3
    
    # 启动前端
    cd "$FRONTEND_DIR"
    log_info "Starting frontend..."
    npm run dev
}

# 使用 Docker Compose 启动
start_docker() {
    log_info "Starting with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # 使用 docker compose (新版) 或 docker-compose (旧版)
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    
    log_success "Services started with Docker Compose"
    log_info "Backend: http://localhost:8001"
    log_info "Frontend: http://localhost:5173"
    log_info "MongoDB: localhost:27017"
    log_info "Neo4j: http://localhost:7474"
    log_info "PostgreSQL: localhost:5432"
}

# 清理残留进程
cleanup_stale_processes() {
    # 清理 8001 端口上的残留进程
    local stale_pid=$(lsof -ti :8001 2>/dev/null)
    if [ -n "$stale_pid" ]; then
        log_warn "Found stale process on port 8001 (PID: $stale_pid), killing..."
        kill -9 $stale_pid 2>/dev/null || true
        sleep 1
    fi
    
    # 清理 5173 端口上的残留进程
    stale_pid=$(lsof -ti :5173 2>/dev/null)
    if [ -n "$stale_pid" ]; then
        log_warn "Found stale process on port 5173 (PID: $stale_pid), killing..."
        kill -9 $stale_pid 2>/dev/null || true
        sleep 1
    fi
    
    # 清理僵尸 python 进程
    local zombies=$(ps aux | grep '[p]ython.*uvicorn' | grep 'Z' | awk '{print $2}')
    if [ -n "$zombies" ]; then
        log_warn "Cleaning zombie processes: $zombies"
        kill -9 $zombies 2>/dev/null || true
    fi
}

# 停止服务
stop_services() {
    log_info "Stopping services..."
    
    # 停止后端 (通过 PID 文件)
    if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
        BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            log_success "Backend stopped (PID: $BACKEND_PID)"
        fi
        rm -f "$PROJECT_ROOT/.backend.pid"
    fi
    
    # 同时清理残留
    cleanup_stale_processes
    
    # 如果使用 Docker
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        if command -v docker &> /dev/null && docker compose version &> /dev/null; then
            docker compose down 2>/dev/null || true
        else
            docker-compose down 2>/dev/null || true
        fi
    fi
    
    log_success "Services stopped"
}

# 显示帮助
show_help() {
    echo "Bio-Agent 启动脚本"
    echo ""
    echo "Usage: ./start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  (no option)     启动前后端服务"
    echo "  --init          初始化数据库后启动"
    echo "  --backend       仅启动后端服务"
    echo "  --frontend      仅启动前端服务"
    echo "  --docker        使用 Docker Compose 启动全部服务"
    echo "  --stop          停止所有服务"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "Examples:"
    echo "  ./start.sh                  # 启动前后端"
    echo "  ./start.sh --init           # 初始化数据库并启动"
    echo "  ./start.sh --docker         # Docker 方式启动"
}

# 主函数
main() {
    echo ""
    echo "============================================"
    echo "  Bio-Agent Platform"
    echo "============================================"
    echo ""
    
    case "${1:-}" in
        --init)
            check_dependencies
            if check_mongodb; then
                init_database
            else
                log_error "MongoDB must be running first"
                log_info "Try: ./start.sh --docker  (to start with Docker)"
                exit 1
            fi
            start_all
            ;;
        --backend)
            check_dependencies
            start_backend
            ;;
        --frontend)
            check_dependencies
            start_frontend
            ;;
        --docker)
            start_docker
            ;;
        --stop)
            stop_services
            ;;
        --help|-h)
            show_help
            ;;
        "")
            check_dependencies
            start_all
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行
main "$@"
