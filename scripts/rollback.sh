#!/bin/bash
# 回滚脚本 - 回退到上一个版本
# 用途: 当新版本出现问题时快速恢复
# 使用: bash scripts/rollback.sh [回退步数,默认1]

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/Moreyudeals"
ROLLBACK_STEPS=${1:-1}  # 默认回退1个版本

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Moreyudeals 回滚工具${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

cd "$PROJECT_DIR"

# 显示当前版本
echo -e "${YELLOW}当前版本:${NC}"
git log -1 --oneline --decorate
echo ""

# 显示将要回滚到的版本
echo -e "${YELLOW}将回滚到:${NC}"
git log --oneline --decorate -n $((ROLLBACK_STEPS + 1)) | tail -n 1
echo ""

# 确认
read -p "确认回滚? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 执行回滚
echo -e "${YELLOW}正在回滚代码...${NC}"
git reset --hard HEAD~"$ROLLBACK_STEPS"
echo -e "${GREEN}✓ 代码已回滚${NC}"
echo ""

# 重新编译 API
echo -e "${YELLOW}重新编译 API...${NC}"
cd "$PROJECT_DIR/packages/api"
npm run build
echo -e "${GREEN}✓ API 编译完成${NC}"
echo ""

# 重新编译 Worker
echo -e "${YELLOW}重新编译 Worker...${NC}"
cd "$PROJECT_DIR/packages/worker"
npm run build
echo -e "${GREEN}✓ Worker 编译完成${NC}"
echo ""

# 重启服务
echo -e "${YELLOW}重启服务...${NC}"
pm2 reload moreyudeals-api
pm2 reload moreyudeals-worker
echo -e "${GREEN}✓ 服务已重启${NC}"
echo ""

# 验证
sleep 2
echo -e "${YELLOW}验证服务状态...${NC}"
pm2 list
echo ""

if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠ API 健康检查未通过(可能端点不存在)${NC}"
fi
echo ""

# 完成
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ 回滚完成!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}当前版本:${NC}"
git log -1 --oneline --decorate
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  - 如果需要恢复到回滚前的版本:"
echo -e "    ${GREEN}git pull origin main${NC}"
echo "  - 查看完整提交历史:"
echo -e "    ${GREEN}git log --oneline -n 10${NC}"
echo ""
