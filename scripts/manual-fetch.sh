#!/bin/bash
# 手动触发一次数据抓取
# 用途: 不清空数据库,仅手动运行一次抓取任务

set -e

echo "========================================="
echo "手动触发数据抓取"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/packages/worker"

cd "$WORKER_DIR"

# 检查环境配置
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✓ 使用生产环境配置${NC}"
    ENV_FILE=".env.production"
elif [ -f ".env" ]; then
    echo -e "${GREEN}✓ 使用开发环境配置${NC}"
    ENV_FILE=".env"
else
    echo -e "${RED}✗ 未找到环境配置文件${NC}"
    exit 1
fi

# 加载环境变量
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo ""
echo "抓取配置:"
echo "  数据库: $DB_NAME"
echo "  翻译功能: ${TRANSLATION_ENABLED:-true}"
echo "  目标语言: ${TRANSLATION_TARGET_LANGUAGES:-zh,en}"
echo ""

# 强制启用翻译, 避免出现未翻译内容
export TRANSLATION_ENABLED=true
echo -e "${GREEN}✓ 翻译功能已自动开启${NC}"

echo ""
echo -e "${YELLOW}开始抓取数据...${NC}"
echo "按 Ctrl+C 可随时停止"
echo ""

# 运行抓取
if [ -f "dist/index.js" ]; then
    # 使用编译后的版本
    node dist/index.js
else
    # 使用 ts-node
    npx tsx src/index.ts
fi

echo ""
echo -e "${GREEN}✓ 抓取完成${NC}"
echo ""

# 显示抓取结果
echo "数据库统计:"

if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD=$DB_PASSWORD
    psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -c "
        SELECT
            COUNT(*) as total_deals,
            COUNT(DISTINCT merchant) as merchants,
            MAX(created_at) as last_updated
        FROM deals;
    "
    unset PGPASSWORD
else
    sudo -u postgres psql -d $DB_NAME -c "
        SELECT
            COUNT(*) as total_deals,
            COUNT(DISTINCT merchant) as merchants,
            MAX(created_at) as last_updated
        FROM deals;
    "
fi

echo ""
