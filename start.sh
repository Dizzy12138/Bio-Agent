#!/bin/bash
# ============================================
# Bio-Agent 一键启动脚本
# ============================================
#
# 使用方法:
#   chmod +x start.sh
#   ./start.sh              # 启动前后端服务
#   ./start.sh --init       # 初始化数据库后启动
#   ./start.sh --backend    # 仅启动后端
#   ./start.sh --frontend   # 仅启动前端
#   ./start.sh --docker     # 使用 Docker Compose 启动
#   ./start.sh --stop       # 停止所有服务
#   ./start.sh --status     # 查看服务状态
#   ./start.sh --help       # 显示帮助
#
# ============================================

set -euo pipefail

# ============ 颜色 & 图标 ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✔${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error()   { echo -e "${RED}✖${NC}  $1"; }

# ============ 路径 ============
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

BACKEND_PORT="${PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

mkdir -p "$PID_DIR" "$LOG_DIR"

# =============================================
# 通用工具函数
# =============================================

# 检查某端口是否有进程在用
port_in_use() {
    lsof -ti :"$1" &>/dev/null
}

# 等待指定端口可用（健康检查）
wait_for_port() {
    local port="$1"
    local name="$2"
    local max_wait="${3:-30}"
    local elapsed=0

    while ! port_in_use "$port"; do
        sleep 1
        elapsed=$((elapsed + 1))
        if [ "$elapsed" -ge "$max_wait" ]; then
            log_error "$name 未能在 ${max_wait}s 内启动"
            return 1
        fi
    done
    log_success "$name 已就绪 (${elapsed}s)"
}

# 等待 HTTP 端点返回 200
wait_for_http() {
    local url="$1"
    local name="$2"
    local max_wait="${3:-30}"
    local elapsed=0

    while ! curl -sf "$url" &>/dev/null; do
        sleep 1
        elapsed=$((elapsed + 1))
        if [ "$elapsed" -ge "$max_wait" ]; then
            log_warn "$name 健康检查超时 (${max_wait}s)，服务可能仍在初始化"
            return 0
        fi
    done
    log_success "$name 健康检查通过 (${elapsed}s)"
}

# 计算最优 worker 数
get_workers() {
    local cpus=$(nproc 2>/dev/null || echo 2)
    local workers=$((cpus > 4 ? 4 : cpus < 2 ? 2 : cpus))
    echo $workers
}

# =============================================
# 依赖检查
# =============================================

check_dependencies() {
    log_info "检查运行依赖..."
    local missing=0

    # Python
    if command -v python3 &>/dev/null; then
        log_success "Python3: $(python3 --version 2>&1 | awk '{print $2}')"
    else
        log_error "未安装 Python3"; missing=1
    fi

    # Node.js
    if command -v node &>/dev/null; then
        log_success "Node.js: $(node --version)"
    else
        log_error "未安装 Node.js"; missing=1
    fi

    # npm
    if command -v npm &>/dev/null; then
        log_success "npm: $(npm --version)"
    else
        log_error "未安装 npm"; missing=1
    fi

    [ "$missing" -ne 0 ] && { log_error "缺少必要依赖，请先安装"; exit 1; }
}

# =============================================
# 数据库服务管理
# =============================================

ensure_mongodb() {
    if command -v mongosh &>/dev/null || command -v mongo &>/dev/null; then
        if ! pgrep -x mongod &>/dev/null; then
            log_info "启动 MongoDB..."
            if command -v systemctl &>/dev/null; then
                sudo systemctl start mongod 2>/dev/null || mongod --fork --logpath "$LOG_DIR/mongod.log" --dbpath /var/lib/mongodb 2>/dev/null || true
            else
                mongod --fork --logpath "$LOG_DIR/mongod.log" 2>/dev/null || true
            fi
            sleep 2
        fi
        if pgrep -x mongod &>/dev/null; then
            log_success "MongoDB 运行中"
        else
            log_warn "MongoDB 未运行 (非必需，但知识图谱功能不可用)"
        fi
    else
        log_warn "MongoDB 未安装，跳过"
    fi
}

ensure_postgres() {
    if command -v psql &>/dev/null; then
        if ! pgrep -x postgres &>/dev/null; then
            log_info "启动 PostgreSQL..."
            if command -v systemctl &>/dev/null; then
                sudo systemctl start postgresql 2>/dev/null || true
            elif command -v pg_ctlcluster &>/dev/null; then
                sudo pg_ctlcluster $(pg_lsclusters -h | head -1 | awk '{print $1, $2}') start 2>/dev/null || true
            fi
            sleep 2
        fi
        if pgrep -x postgres &>/dev/null; then
            log_success "PostgreSQL 运行中"
        else
            log_warn "PostgreSQL 未运行 (用户管理功能不可用)"
        fi
    fi
}

ensure_databases() {
    log_info "检查数据库服务..."
    ensure_mongodb
    ensure_postgres
}

# =============================================
# 初始化数据库
# =============================================

init_database() {
    log_info "初始化数据库..."
    cd "$BACKEND_DIR"
    activate_venv
    python3 scripts/init_database.py
    log_success "数据库初始化完成"
}

# =============================================
# Python 虚拟环境
# =============================================

activate_venv() {
    if [ -d "$BACKEND_DIR/venv" ]; then
        source "$BACKEND_DIR/venv/bin/activate"
    else
        log_info "创建 Python 虚拟环境..."
        python3 -m venv "$BACKEND_DIR/venv"
        source "$BACKEND_DIR/venv/bin/activate"
        log_info "安装 Python 依赖..."
        pip install -q -r "$BACKEND_DIR/requirements.txt"
        log_success "Python 依赖安装完成"
    fi
}

# =============================================
# 清理 & 关闭
# =============================================

kill_port() {
    local port="$1"
    local pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        log_warn "清理端口 $port 上的进程 (PID: $pids)"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

cleanup() {
    echo ""
    log_info "正在关闭服务..."

    # 通过 PID 文件关闭
    for pidfile in "$PID_DIR"/*.pid; do
        [ -f "$pidfile" ] || continue
        local pid=$(cat "$pidfile")
        local name=$(basename "$pidfile" .pid)
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            # 等待进程退出，最多 5s
            for i in $(seq 1 5); do
                kill -0 "$pid" 2>/dev/null || break
                sleep 1
            done
            # 仍然存在则 force kill
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
            log_success "$name 已停止 (PID: $pid)"
        fi
        rm -f "$pidfile"
    done

    # 清理可能残留的端口占用
    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"

    log_success "所有服务已停止"
}

# =============================================
# 启动后端
# =============================================

start_backend() {
    local background="${1:-false}"
    local force="${2:-false}"

    # 检测已运行的后端服务
    if port_in_use "$BACKEND_PORT" && [ "$force" != "true" ]; then
        local existing_pid=$(lsof -ti :"$BACKEND_PORT" 2>/dev/null | head -1)
        log_success "后端已在运行中 → http://localhost:${BACKEND_PORT} (PID: $existing_pid)，跳过启动"
        return 0
    fi

    cd "$BACKEND_DIR"
    activate_venv

    # 检查 .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_warn ".env 文件不存在，使用默认配置"
    fi

    local WORKERS=$(get_workers)
    # 强制模式下先清理
    if [ "$force" = "true" ]; then
        kill_port "$BACKEND_PORT"
    fi

    if [ "$background" = "true" ]; then
        log_info "后端启动中 (后台模式, workers: $WORKERS)..."
        nohup python -m uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "$BACKEND_PORT" \
            --workers "$WORKERS" \
            --timeout-keep-alive 30 \
            --limit-concurrency 100 \
            --log-level info \
            > "$LOG_DIR/backend.log" 2>&1 &
        local pid=$!
        echo $pid > "$PID_DIR/backend.pid"
        wait_for_http "http://localhost:${BACKEND_PORT}/api/v1/health" "后端 API" 15 || true
        log_success "后端已启动 → http://localhost:${BACKEND_PORT} (PID: $pid)"
    else
        log_info "后端启动 (前台模式, workers: $WORKERS)..."
        log_info "后端地址 → http://localhost:${BACKEND_PORT}"
        python -m uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "$BACKEND_PORT" \
            --workers "$WORKERS" \
            --timeout-keep-alive 30 \
            --limit-concurrency 100 \
            --log-level info
    fi
}

# =============================================
# 启动前端
# =============================================

start_frontend() {
    local background="${1:-false}"
    local force="${2:-false}"

    # 检测已运行的前端服务
    if port_in_use "$FRONTEND_PORT" && [ "$force" != "true" ]; then
        local existing_pid=$(lsof -ti :"$FRONTEND_PORT" 2>/dev/null | head -1)
        log_success "前端已在运行中 → http://localhost:${FRONTEND_PORT} (PID: $existing_pid)，跳过启动"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install --silent
        log_success "前端依赖安装完成"
    fi

    # 强制模式下先清理
    if [ "$force" = "true" ]; then
        kill_port "$FRONTEND_PORT"
    fi

    if [ "$background" = "true" ]; then
        log_info "前端启动中 (后台模式)..."
        nohup npx vite --host 0.0.0.0 --port "$FRONTEND_PORT" \
            > "$LOG_DIR/frontend.log" 2>&1 &
        local pid=$!
        echo $pid > "$PID_DIR/frontend.pid"
        wait_for_port "$FRONTEND_PORT" "前端 Vite" 20 || true
        log_success "前端已启动 → http://localhost:${FRONTEND_PORT} (PID: $pid)"
    else
        log_info "前端启动 (前台模式)..."
        log_info "前端地址 → http://localhost:${FRONTEND_PORT}"
        npx vite --host 0.0.0.0 --port "$FRONTEND_PORT"
    fi
}

# =============================================
# 启动全部
# =============================================

start_all() {
    check_dependencies
    ensure_databases

    echo ""
    log_info "${BOLD}启动 Bio-Agent Platform...${NC}"
    echo ""

    # 后端 (后台) — 已运行则跳过
    start_backend "true"

    # 前端 (前台，Ctrl+C 会触发 trap → cleanup) — 已运行则跳过
    start_frontend "false"
}

# =============================================
# Docker 模式
# =============================================

start_docker() {
    log_info "Docker Compose 启动..."

    cd "$PROJECT_ROOT"

    if ! command -v docker &>/dev/null; then
        log_error "未安装 Docker"
        exit 1
    fi

    if docker compose version &>/dev/null; then
        docker compose up -d --build
    elif command -v docker-compose &>/dev/null; then
        docker-compose up -d --build
    else
        log_error "未安装 docker compose / docker-compose"
        exit 1
    fi

    echo ""
    log_success "Docker 服务已启动:"
    log_info "  前端:       http://localhost:${FRONTEND_PORT}"
    log_info "  后端 API:   http://localhost:${BACKEND_PORT}"
    log_info "  MongoDB:    localhost:27017"
    log_info "  PostgreSQL: localhost:5432"
}

# =============================================
# 服务状态
# =============================================

show_status() {
    echo ""
    echo -e "${BOLD}Bio-Agent 服务状态${NC}"
    echo "────────────────────────────────────"

    # 后端
    if port_in_use "$BACKEND_PORT"; then
        local bpid=$(lsof -ti :"$BACKEND_PORT" 2>/dev/null | head -1)
        echo -e "  后端 API   ${GREEN}● 运行中${NC}  :${BACKEND_PORT}  PID:${bpid}"
    else
        echo -e "  后端 API   ${RED}○ 未运行${NC}  :${BACKEND_PORT}"
    fi

    # 前端
    if port_in_use "$FRONTEND_PORT"; then
        local fpid=$(lsof -ti :"$FRONTEND_PORT" 2>/dev/null | head -1)
        echo -e "  前端 Vite  ${GREEN}● 运行中${NC}  :${FRONTEND_PORT}  PID:${fpid}"
    else
        echo -e "  前端 Vite  ${RED}○ 未运行${NC}  :${FRONTEND_PORT}"
    fi

    # MongoDB
    if pgrep -x mongod &>/dev/null; then
        echo -e "  MongoDB    ${GREEN}● 运行中${NC}  :27017"
    else
        echo -e "  MongoDB    ${RED}○ 未运行${NC}"
    fi

    # PostgreSQL
    if pgrep -x postgres &>/dev/null; then
        echo -e "  PostgreSQL ${GREEN}● 运行中${NC}  :5432"
    else
        echo -e "  PostgreSQL ${RED}○ 未运行${NC}"
    fi

    echo "────────────────────────────────────"
    echo -e "  日志目录: ${CYAN}$LOG_DIR/${NC}"
    echo ""
}

# =============================================
# 帮助信息
# =============================================

show_help() {
    echo ""
    echo -e "${BOLD}Bio-Agent 一键启动脚本${NC}"
    echo ""
    echo "Usage: ./start.sh [OPTION]"
    echo ""
    echo "  (无参数)        启动前后端服务（推荐）"
    echo "  --init          初始化数据库后启动"
    echo "  --backend       仅启动后端 (前台模式)"
    echo "  --frontend      仅启动前端 (前台模式)"
    echo "  --docker        使用 Docker Compose 启动"
    echo "  --restart       强制重启所有服务"
    echo "  --stop          停止所有服务"
    echo "  --status        查看服务运行状态"
    echo "  --help, -h      显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  PORT             后端端口 (默认: 8001)"
    echo "  FRONTEND_PORT    前端端口 (默认: 5173)"
    echo ""
    echo "示例:"
    echo "  ./start.sh                     # 一键启动（已运行的服务会跳过）"
    echo "  ./start.sh --init              # 首次部署：初始化 DB + 启动"
    echo "  ./start.sh --restart           # 强制重启所有服务"
    echo "  PORT=9000 ./start.sh           # 指定后端端口"
    echo "  ./start.sh --stop              # 停止所有服务"
    echo ""
}

# =============================================
# 主入口
# =============================================

main() {
    # Ctrl+C 优雅关闭
    trap cleanup SIGINT SIGTERM

    echo ""
    echo -e "${BOLD}╔══════════════════════════════════╗${NC}"
    echo -e "${BOLD}║     🧬 Bio-Agent Platform        ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════╝${NC}"
    echo ""

    case "${1:-}" in
        --init)
            check_dependencies
            ensure_databases
            init_database
            start_all
            ;;
        --backend)
            check_dependencies
            ensure_databases
            start_backend "false"
            ;;
        --frontend)
            check_dependencies
            start_frontend "false"
            ;;
        --docker)
            start_docker
            ;;
        --stop)
            cleanup
            ;;
        --restart)
            log_info "强制重启所有服务..."
            cleanup
            check_dependencies
            ensure_databases
            echo ""
            log_info "${BOLD}启动 Bio-Agent Platform...${NC}"
            echo ""
            start_backend "true" "true"
            start_frontend "false" "true"
            ;;
        --status)
            show_status
            ;;
        --help|-h)
            show_help
            ;;
        "")
            start_all
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
