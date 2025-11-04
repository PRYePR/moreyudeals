#!/bin/bash
# 数据库统计查询脚本
# 用途: 快速查看数据库中的数据统计信息

set -e

echo "========================================="
echo "数据库统计信息"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/packages/worker"

# 加载环境变量
if [ -f "$WORKER_DIR/.env.production" ]; then
    export $(grep -v '^#' "$WORKER_DIR/.env.production" | xargs)
elif [ -f "$WORKER_DIR/.env" ]; then
    export $(grep -v '^#' "$WORKER_DIR/.env" | xargs)
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-moreyudeals}
DB_USER=${DB_USER:-moreyudeals}
DB_PASSWORD=${DB_PASSWORD}

# 构建 psql 命令
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD=$DB_PASSWORD
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
else
    PSQL_CMD="sudo -u postgres psql -d $DB_NAME"
fi

# 1. 总体统计
echo -e "${YELLOW}=== 总体统计 ===${NC}"
$PSQL_CMD <<EOF
SELECT
    COUNT(*) as "总交易数",
    COUNT(DISTINCT merchant) as "商家数量",
    COUNT(DISTINCT category_id) as "分类数量",
    MIN(created_at)::date as "最早数据",
    MAX(created_at)::date as "最新数据"
FROM deals;
EOF

echo ""

# 2. 按商家统计
echo -e "${YELLOW}=== 按商家统计 (Top 10) ===${NC}"
$PSQL_CMD <<EOF
SELECT
    merchant as "商家",
    COUNT(*) as "交易数"
FROM deals
GROUP BY merchant
ORDER BY COUNT(*) DESC
LIMIT 10;
EOF

echo ""

# 3. 按分类统计
echo -e "${YELLOW}=== 按分类统计 ===${NC}"
$PSQL_CMD <<EOF
SELECT
    COALESCE(c.name, '未分类') as "分类",
    COUNT(d.id) as "交易数"
FROM deals d
LEFT JOIN categories c ON d.category_id = c.id
GROUP BY c.name
ORDER BY COUNT(d.id) DESC;
EOF

echo ""

# 4. 翻译状态统计
echo -e "${YELLOW}=== 翻译状态统计 ===${NC}"
$PSQL_CMD <<EOF
SELECT
    COUNT(*) as "总数",
    COUNT(title_zh) as "已翻译(中文)",
    COUNT(title_en) as "已翻译(英文)",
    ROUND(COUNT(title_zh)::numeric / COUNT(*) * 100, 2) as "中文覆盖率(%)",
    ROUND(COUNT(title_en)::numeric / COUNT(*) * 100, 2) as "英文覆盖率(%)"
FROM deals;
EOF

echo ""

# 5. 最新10条记录
echo -e "${YELLOW}=== 最新10条记录 ===${NC}"
$PSQL_CMD <<EOF
SELECT
    id,
    LEFT(title, 50) as "标题",
    merchant as "商家",
    price as "价格",
    created_at::timestamp(0) as "创建时间"
FROM deals
ORDER BY created_at DESC
LIMIT 10;
EOF

echo ""

# 6. 按日期统计 (最近7天)
echo -e "${YELLOW}=== 最近7天抓取统计 ===${NC}"
$PSQL_CMD <<EOF
SELECT
    created_at::date as "日期",
    COUNT(*) as "新增交易数"
FROM deals
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY created_at::date
ORDER BY created_at::date DESC;
EOF

echo ""

# 7. 数据源统计
echo -e "${YELLOW}=== 数据源统计 ===${NC}"
$PSQL_CMD <<EOF
SELECT
    name as "数据源",
    url as "URL",
    is_active as "是否启用",
    last_fetched_at::timestamp(0) as "最后抓取时间"
FROM data_sources
ORDER BY last_fetched_at DESC;
EOF

echo ""

# 清理
if [ -n "$DB_PASSWORD" ]; then
    unset PGPASSWORD
fi

echo "========================================="
echo -e "${GREEN}统计完成${NC}"
echo "========================================="
