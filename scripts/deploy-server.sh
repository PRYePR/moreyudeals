#!/bin/bash
# 服务器端一键部署脚本
# 用途: 在服务器上首次部署或完整重新部署 Moreyudeals Worker

set -e

echo "========================================="
echo "Moreyudeals 服务器端部署脚本"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取脚本所在目录的父目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "项目目录: $PROJECT_ROOT"
echo ""

# 检查必要的工具
echo -e "${YELLOW}[1/8] 检查系统环境...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}✗ 未找到 Node.js，请先安装${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}✗ 未找到 npm，请先安装${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${RED}✗ 未找到 PM2，请先安装${NC}"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}✗ 未找到 PostgreSQL 客户端${NC}"; exit 1; }
echo -e "${GREEN}✓ 系统环境检查通过${NC}"
echo ""

# 检查 .env 文件（服务器使用 .env，不是 .env.production）
echo -e "${YELLOW}[2/8] 检查配置文件...${NC}"
if [ ! -f "packages/worker/.env" ]; then
    echo -e "${RED}✗ 未找到 .env 文件${NC}"
    echo "请先创建配置文件: packages/worker/.env"
    echo "提示: 服务器上使用 .env 文件（不是 .env.production）"
    exit 1
fi
echo -e "${GREEN}✓ 配置文件存在${NC}"
echo ""

# 安装依赖
echo -e "${YELLOW}[3/8] 安装项目依赖...${NC}"
npm ci
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 构建项目
echo -e "${YELLOW}[4/8] 构建 Worker 项目...${NC}"
cd packages/worker
npm run build
echo -e "${GREEN}✓ 项目构建完成${NC}"
echo ""
cd "$PROJECT_ROOT"

# 数据库初始化（可选）
echo -e "${YELLOW}[5/8] 数据库初始化...${NC}"
read -p "是否需要初始化数据库？(y/n): " init_db
if [ "$init_db" = "y" ] || [ "$init_db" = "Y" ]; then
    echo "运行数据库初始化脚本..."
    bash scripts/init-database-server.sh
    echo -e "${GREEN}✓ 数据库初始化完成${NC}"
else
    echo -e "${YELLOW}⊘ 跳过数据库初始化${NC}"
fi
echo ""

# 停止现有服务
echo -e "${YELLOW}[6/8] 停止现有服务...${NC}"
pm2 delete moreyudeals-worker 2>/dev/null || echo "没有运行中的服务"
echo -e "${GREEN}✓ 现有服务已停止${NC}"
echo ""

# 启动服务
echo -e "${YELLOW}[7/8] 启动 Worker 服务...${NC}"
cd packages/worker
# 服务器上直接使用 .env 文件，不需要 --env production
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ 服务启动成功${NC}"
echo ""

# 显示服务状态
echo -e "${YELLOW}[8/8] 服务状态...${NC}"
pm2 status
pm2 logs moreyudeals-worker --lines 20
echo ""

echo "========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "========================================="
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs moreyudeals-worker"
echo "  重启服务: pm2 restart moreyudeals-worker"
echo "  停止服务: pm2 stop moreyudeals-worker"
echo "  服务状态: pm2 status"
echo ""
