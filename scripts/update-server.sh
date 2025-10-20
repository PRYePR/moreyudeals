#!/bin/bash
# 服务器端快速更新脚本
# 用途: 拉取最新代码并重启服务（日常开发更新）

set -e

echo "========================================="
echo "Moreyudeals 快速更新脚本"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "项目目录: $PROJECT_ROOT"
echo ""

# 检查是否有未提交的更改
echo -e "${YELLOW}[1/5] 检查本地更改...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}⚠ 检测到未提交的更改${NC}"
    git status --short
    read -p "是否继续更新？本地更改可能丢失 (y/n): " continue_update
    if [ "$continue_update" != "y" ] && [ "$continue_update" != "Y" ]; then
        echo "更新已取消"
        exit 0
    fi
fi
echo -e "${GREEN}✓ 检查完成${NC}"
echo ""

# 拉取最新代码
echo -e "${YELLOW}[2/5] 拉取最新代码...${NC}"
git fetch origin
git reset --hard origin/$(git rev-parse --abbrev-ref HEAD)
echo -e "${GREEN}✓ 代码更新完成${NC}"
echo ""

# 安装/更新依赖
echo -e "${YELLOW}[3/5] 更新依赖...${NC}"
pnpm install
echo -e "${GREEN}✓ 依赖更新完成${NC}"
echo ""

# 重新构建
echo -e "${YELLOW}[4/5] 重新构建项目...${NC}"
cd packages/worker
pnpm run build
echo -e "${GREEN}✓ 构建完成${NC}"
echo ""
cd "$PROJECT_ROOT"

# 重启服务
echo -e "${YELLOW}[5/5] 重启服务...${NC}"
pm2 restart moreyudeals-worker
pm2 save
echo -e "${GREEN}✓ 服务重启成功${NC}"
echo ""

# 显示日志
echo "最新日志:"
pm2 logs moreyudeals-worker --lines 20 --nostream
echo ""

echo "========================================="
echo -e "${GREEN}更新完成！${NC}"
echo "========================================="
echo ""
echo "当前版本:"
git log -1 --oneline
echo ""
