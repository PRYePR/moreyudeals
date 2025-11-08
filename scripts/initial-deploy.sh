#!/bin/bash
# 首次部署脚本 - Moreyudeals 自动部署系统
# 用途: 从手动部署迁移到自动化部署
# 使用: bash scripts/initial-deploy.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Moreyudeals 首次自动部署${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 配置变量
PROJECT_DIR="/var/www/Moreyudeals"
OLD_API_DIR="/root/moreyudeals-api"
OLD_WORKER_DIR="/root/moreyudeals-worker"
BACKUP_DIR="/root/moreyudeals-backup-$(date +%Y%m%d-%H%M%S)"
GIT_REPO="git@github.com:PRYePR/moreyudeals.git"

# 步骤 0: 前置检查
echo -e "${YELLOW}[0/8] 前置检查...${NC}"
echo "检查必要的软件..."

if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git 未安装,请先安装: apt install git${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装,请先安装${NC}"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}✗ PM2 未安装,请先安装: npm install -g pm2${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 所有必要软件已安装${NC}"
echo ""

# 测试 GitHub SSH
echo "测试 GitHub SSH 连接..."
if ! ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo -e "${RED}✗ GitHub SSH 连接失败${NC}"
    echo "请先运行: ${YELLOW}bash scripts/setup-github-ssh.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ GitHub SSH 连接正常${NC}"
echo ""

# 步骤 1: 备份旧部署
echo -e "${YELLOW}[1/8] 备份旧部署...${NC}"
mkdir -p "$BACKUP_DIR"

if [ -d "$OLD_API_DIR" ]; then
    echo "备份旧的 API 目录..."
    cp -r "$OLD_API_DIR" "$BACKUP_DIR/api"
    echo -e "${GREEN}✓ API 已备份到 $BACKUP_DIR/api${NC}"
else
    echo -e "${YELLOW}⚠ 未找到旧的 API 目录,跳过${NC}"
fi

if [ -d "$OLD_WORKER_DIR" ]; then
    echo "备份旧的 Worker 目录..."
    cp -r "$OLD_WORKER_DIR" "$BACKUP_DIR/worker"
    echo -e "${GREEN}✓ Worker 已备份到 $BACKUP_DIR/worker${NC}"
else
    echo -e "${YELLOW}⚠ 未找到旧的 Worker 目录,跳过${NC}"
fi
echo ""

# 步骤 2: 停止并删除旧的 PM2 进程
echo -e "${YELLOW}[2/8] 停止旧的 PM2 进程...${NC}"
if pm2 list | grep -q "moreyudeals"; then
    pm2 stop all
    pm2 delete all
    pm2 save --force
    echo -e "${GREEN}✓ 旧的 PM2 进程已停止并删除${NC}"
else
    echo -e "${YELLOW}⚠ 未发现运行中的进程,跳过${NC}"
fi
echo ""

# 步骤 3: 克隆代码仓库
echo -e "${YELLOW}[3/8] 克隆代码仓库...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${RED}✗ 目标目录已存在: $PROJECT_DIR${NC}"
    read -p "是否删除并重新克隆? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR"
    else
        echo "已取消"
        exit 1
    fi
fi

echo "正在克隆仓库..."
git clone "$GIT_REPO" "$PROJECT_DIR"
cd "$PROJECT_DIR"
git checkout main
echo -e "${GREEN}✓ 代码仓库已克隆到 $PROJECT_DIR${NC}"
echo ""

# 步骤 4: 配置环境变量
echo -e "${YELLOW}[4/8] 配置环境变量...${NC}"
API_ENV_FILE="$PROJECT_DIR/packages/api/.env.production"

if [ -f "$API_ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ 环境变量文件已存在,跳过创建${NC}"
else
    echo "创建 API 环境变量文件..."
    cat > "$API_ENV_FILE" << 'EOF'
# API Server Configuration - Production
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=43.157.40.96
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyudeals
DB_PASSWORD=bTXsPFtiLb7tNH87

# API Security - 固定密钥(不要改!)
API_KEY=hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=

# CORS Configuration - 允许 Vercel 前端
ALLOWED_ORIGINS=https://deals.moreyu.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    chmod 600 "$API_ENV_FILE"
    echo -e "${GREEN}✓ 环境变量文件已创建${NC}"
fi

# 添加到 .gitignore
if ! grep -q ".env.production" "$PROJECT_DIR/packages/api/.gitignore" 2>/dev/null; then
    echo ".env.production" >> "$PROJECT_DIR/packages/api/.gitignore"
    echo -e "${GREEN}✓ .env.production 已添加到 .gitignore${NC}"
fi
echo ""

# 步骤 5: 安装依赖
echo -e "${YELLOW}[5/8] 安装依赖...${NC}"
cd "$PROJECT_DIR"

# 检查是用 yarn 还是 npm
if [ -f "yarn.lock" ]; then
    echo "检测到 yarn.lock,使用 yarn..."
    if ! command -v yarn &> /dev/null; then
        echo "安装 yarn..."
        npm install -g yarn
    fi
    yarn install
else
    echo "使用 npm 安装根依赖..."
    npm install
fi
echo -e "${GREEN}✓ 根依赖已安装${NC}"
echo ""

# 步骤 6: 编译 API 和 Worker
echo -e "${YELLOW}[6/8] 编译 TypeScript...${NC}"

# 编译 API
echo "编译 API..."
cd "$PROJECT_DIR/packages/api"
npm install
npm run build
echo -e "${GREEN}✓ API 编译完成${NC}"

# 编译 Worker
echo "编译 Worker..."
cd "$PROJECT_DIR/packages/worker"
npm install
npm run build
echo -e "${GREEN}✓ Worker 编译完成${NC}"
echo ""

# 步骤 7: 启动 PM2 服务
echo -e "${YELLOW}[7/8] 启动 PM2 服务...${NC}"

# 启动 API
echo "启动 API..."
cd "$PROJECT_DIR/packages/api"
pm2 start ecosystem.config.js
echo -e "${GREEN}✓ API 已启动${NC}"

# 启动 Worker
echo "启动 Worker..."
cd "$PROJECT_DIR/packages/worker"
pm2 start ecosystem.config.js
echo -e "${GREEN}✓ Worker 已启动${NC}"

# 保存 PM2 配置
pm2 save
echo -e "${GREEN}✓ PM2 配置已保存${NC}"

# 设置 PM2 开机自启
echo "配置 PM2 开机自启..."
pm2 startup | tail -n 1 | bash || true
echo -e "${GREEN}✓ PM2 开机自启已配置${NC}"
echo ""

# 步骤 8: 配置自动部署 Cron
echo -e "${YELLOW}[8/8] 配置自动部署...${NC}"
CRON_CMD="*/5 * * * * $PROJECT_DIR/scripts/auto-deploy.sh"

if crontab -l 2>/dev/null | grep -q "auto-deploy.sh"; then
    echo -e "${YELLOW}⚠ Cron 任务已存在,跳过${NC}"
else
    echo "添加 Cron 任务(每 5 分钟检查更新)..."
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo -e "${GREEN}✓ 自动部署已配置${NC}"
fi
echo ""

# 创建日志目录
mkdir -p /var/log/moreyudeals
chmod 755 /var/log/moreyudeals

# 验证部署
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✓✓✓ 首次部署完成! ✓✓✓${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "当前服务状态:"
pm2 list
echo ""

echo -e "${YELLOW}下一步验证:${NC}"
echo "1. 检查 API 是否响应:"
echo -e "   ${GREEN}curl http://localhost:3001/health${NC}"
echo ""
echo "2. 查看 PM2 日志:"
echo -e "   ${GREEN}pm2 logs${NC}"
echo ""
echo "3. 查看服务状态:"
echo -e "   ${GREEN}bash scripts/check-status.sh${NC}"
echo ""
echo "4. 测试 Vercel 前端能否访问 API:"
echo -e "   打开浏览器访问: ${GREEN}https://deals.moreyu.com${NC}"
echo ""
echo -e "${BLUE}自动部署已启用:${NC}"
echo "  - 每 5 分钟检查 GitHub 更新"
echo "  - 有新代码自动拉取、编译、重启"
echo "  - 查看部署日志: ${GREEN}tail -f /var/log/moreyudeals-deploy.log${NC}"
echo ""
echo -e "${YELLOW}备份位置:${NC} $BACKUP_DIR"
echo -e "${YELLOW}如果需要回滚:${NC} bash scripts/rollback.sh"
echo ""
