#!/bin/bash
# 手动部署脚本 - 强制重新部署
# 用途: 当需要立即部署时使用(不等待 Cron)
# 使用: bash scripts/manual-deploy.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/Moreyudeals"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Moreyudeals 手动部署${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

cd "$PROJECT_DIR"

# 显示当前版本
echo -e "${YELLOW}当前版本:${NC}"
git log -1 --oneline
echo ""

# 拉取最新代码
echo -e "${YELLOW}[1/5] 拉取最新代码...${NC}"
git fetch origin main
BEFORE=$(git rev-parse HEAD)
AFTER=$(git rev-parse origin/main)

if [ "$BEFORE" = "$AFTER" ]; then
    echo -e "${GREEN}✓ 已是最新版本${NC}"
else
    git pull origin main
    echo -e "${GREEN}✓ 代码已更新${NC}"
    echo "变更内容:"
    git log --oneline "$BEFORE".."$AFTER"
fi
echo ""

# 安装依赖
echo -e "${YELLOW}[2/5] 更新依赖...${NC}"
cd "$PROJECT_DIR/packages/api"
npm install --production=false
echo -e "${GREEN}✓ API 依赖已更新${NC}"

cd "$PROJECT_DIR/packages/worker"
npm install --production=false
echo -e "${GREEN}✓ Worker 依赖已更新${NC}"
echo ""

# 编译 API
echo -e "${YELLOW}[3/5] 编译 API...${NC}"
cd "$PROJECT_DIR/packages/api"
npm run build
echo -e "${GREEN}✓ API 编译完成${NC}"
echo ""

# 编译 Worker
echo -e "${YELLOW}[4/5] 编译 Worker...${NC}"
cd "$PROJECT_DIR/packages/worker"
npm run build
echo -e "${GREEN}✓ Worker 编译完成${NC}"
echo ""

# 重启服务
echo -e "${YELLOW}[5/5] 重启服务...${NC}"
pm2 reload moreyudeals-api
echo -e "${GREEN}✓ API 已重启${NC}"

pm2 reload moreyudeals-worker
echo -e "${GREEN}✓ Worker 已重启${NC}"
echo ""

# 验证
sleep 2
echo -e "${YELLOW}验证部署...${NC}"
pm2 list
echo ""

if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠ API 健康检查未通过(可能端点不存在,但服务可能正常)${NC}"
fi
echo ""

# 完成
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ 手动部署完成!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}当前版本:${NC}"
git log -1 --oneline
echo ""
echo "查看日志: ${GREEN}pm2 logs${NC}"
echo ""
