#!/bin/bash
# 数据库初始化脚本 - 新服务器
# 用途: 在新服务器 43.157.40.96 上初始化数据库

set -e

echo "========================================="
echo "Moreyudeals 数据库初始化脚本"
echo "目标服务器: 43.157.40.96"
echo "========================================="
echo ""

# 数据库配置
DB_HOST="43.157.40.96"
DB_PORT="5432"
DB_NAME="moreyudeals"
DB_USER="moreyudeals"
DB_PASSWORD="338e930fbb"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查 PostgreSQL 连接
echo -e "${YELLOW}[1/7] 测试数据库连接...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}✗ 数据库连接失败，请检查配置${NC}"
    exit 1
fi
echo ""

# 数据库已存在，跳过检查
echo -e "${YELLOW}[2/7] 数据库 '$DB_NAME' 已就绪${NC}"
echo ""

# 执行迁移脚本
MIGRATIONS_DIR="$(dirname "$0")/../packages/worker/migrations"
echo -e "${YELLOW}[3/7] 执行数据库迁移...${NC}"
echo "迁移目录: $MIGRATIONS_DIR"
echo ""

for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")
        echo "执行迁移: $filename"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration"
        echo -e "${GREEN}✓ $filename 完成${NC}"
    fi
done
echo ""

# 验证表结构
echo -e "${YELLOW}[4/7] 验证表结构...${NC}"
TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public';")

if [ -z "$TABLES" ]; then
    echo -e "${RED}✗ 未找到任何表，迁移可能失败${NC}"
    exit 1
else
    echo "已创建的表:"
    echo "$TABLES" | while read table; do
        echo "  - $table"
    done
    echo -e "${GREEN}✓ 表结构验证通过${NC}"
fi
echo ""

# 显示 deals 表结构
echo -e "${YELLOW}[5/7] 显示 deals 表结构...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d deals"
echo ""

# 创建索引（如果需要）
echo -e "${YELLOW}[6/7] 创建额外索引...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
-- 确保关键索引存在
CREATE INDEX IF NOT EXISTS idx_deals_merchant_link ON deals(merchant_link);
CREATE INDEX IF NOT EXISTS idx_deals_fallback_link ON deals(fallback_link);
CREATE INDEX IF NOT EXISTS idx_deals_published_at ON deals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_merchant ON deals(merchant);
CREATE INDEX IF NOT EXISTS idx_deals_external_id ON deals(external_id);
EOF
echo -e "${GREEN}✓ 索引创建完成${NC}"
echo ""

# 显示数据库统计
echo -e "${YELLOW}[7/7] 数据库统计...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT
    COUNT(*) as total_deals,
    pg_size_pretty(pg_database_size('$DB_NAME')) as database_size,
    pg_size_pretty(pg_total_relation_size('deals')) as deals_table_size
FROM deals;
EOF
echo ""

echo "========================================="
echo -e "${GREEN}数据库初始化完成！${NC}"
echo "========================================="
echo ""
echo "数据库信息:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""
echo "下一步:"
echo "1. 部署 Worker 服务"
echo "2. 部署 Web 服务到 Vercel"
echo ""
