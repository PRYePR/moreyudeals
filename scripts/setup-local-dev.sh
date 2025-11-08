#!/bin/bash
# ============================================
# Moreyudeals 本地开发环境一键初始化脚本
# 用途: 创建本地数据库并执行所有迁移脚本
# 使用: bash scripts/setup-local-dev.sh
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Moreyudeals 本地开发环境初始化${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. 检查 PostgreSQL 是否运行
echo -e "${YELLOW}[1/5] 检查 PostgreSQL 服务...${NC}"
if ! pg_isready -q; then
  echo -e "${YELLOW}PostgreSQL 未运行，正在启动...${NC}"
  brew services start postgresql@15
  sleep 3

  if ! pg_isready -q; then
    echo -e "${RED}❌ PostgreSQL 启动失败，请手动检查${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ PostgreSQL 正在运行${NC}"
echo ""

# 2. 创建本地数据库
echo -e "${YELLOW}[2/5] 创建本地数据库...${NC}"
DB_NAME="moreyudeals_dev"

# 检查数据库是否已存在
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${YELLOW}⚠️  数据库 $DB_NAME 已存在${NC}"
  read -p "是否删除并重建？(y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}正在删除数据库...${NC}"
    dropdb "$DB_NAME"
    createdb "$DB_NAME"
    echo -e "${GREEN}✅ 数据库已重建${NC}"
  else
    echo -e "${YELLOW}跳过数据库创建${NC}"
  fi
else
  createdb "$DB_NAME"
  echo -e "${GREEN}✅ 数据库 $DB_NAME 创建成功${NC}"
fi
echo ""

# 3. 执行数据库迁移
echo -e "${YELLOW}[3/5] 执行数据库迁移...${NC}"
WORKER_DIR="/Users/prye/Documents/Moreyudeals/packages/worker"
MIGRATIONS_DIR="$WORKER_DIR/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}❌ 迁移目录不存在: $MIGRATIONS_DIR${NC}"
  exit 1
fi

# 按顺序执行迁移脚本
MIGRATION_FILES=(
  "001_create_tables.sql"
  "002_create_deals_table.sql"
  "003_rename_rss_feeds_to_data_sources.sql"
  "004_create_permission_separated_users.sql"
  "005_add_price_update_fields.sql"
  "006_add_fallback_link.sql"
)

for migration in "${MIGRATION_FILES[@]}"; do
  migration_path="$MIGRATIONS_DIR/$migration"

  if [ ! -f "$migration_path" ]; then
    echo -e "${YELLOW}⚠️  迁移文件不存在: $migration (跳过)${NC}"
    continue
  fi

  echo -e "  执行: ${migration}..."
  if psql -d "$DB_NAME" -f "$migration_path" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ $migration${NC}"
  else
    echo -e "${YELLOW}  ⚠️  $migration (可能已执行过)${NC}"
  fi
done
echo ""

# 4. 验证表结构
echo -e "${YELLOW}[4/5] 验证表结构...${NC}"
TABLE_COUNT=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "  发现 ${GREEN}$TABLE_COUNT${NC} 个表"

# 列出所有表
echo -e "\n  表列表:"
psql -d "$DB_NAME" -c "\dt" | grep -E "data_sources|deals|rss_items|translation_jobs" | while read line; do
  echo -e "  ${GREEN}✓${NC} $line"
done
echo ""

# 5. 插入初始数据（可选）
echo -e "${YELLOW}[5/5] 插入初始数据...${NC}"
psql -d "$DB_NAME" <<EOF > /dev/null 2>&1
-- 插入 Sparhamster 数据源（如果不存在）
INSERT INTO data_sources (name, url, type, enabled, parser_config)
VALUES (
  'Sparhamster',
  'https://www.sparhamster.at/wp-json/wp/v2/posts',
  'rss',
  true,
  '{"api_mode": true}'::jsonb
)
ON CONFLICT DO NOTHING;
EOF

DATA_SOURCES_COUNT=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM data_sources;")
echo -e "  数据源: ${GREEN}$DATA_SOURCES_COUNT${NC} 条"
echo ""

# 完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 本地开发环境初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "下一步:"
echo -e "  1. 配置环境变量:"
echo -e "     ${YELLOW}cd packages/worker && cp .env.example .env.local${NC}"
echo -e "     ${YELLOW}nano .env.local${NC} (修改 DB_NAME=moreyudeals_dev)"
echo -e ""
echo -e "  2. 安装依赖:"
echo -e "     ${YELLOW}cd /Users/prye/Documents/Moreyudeals${NC}"
echo -e "     ${YELLOW}npm install${NC}"
echo -e ""
echo -e "  3. 启动 Worker:"
echo -e "     ${YELLOW}cd packages/worker${NC}"
echo -e "     ${YELLOW}npm run dev${NC}"
echo -e ""
echo -e "  4. 测试抓取:"
echo -e "     ${YELLOW}TRANSLATION_ENABLED=true npx tsx src/index.ts${NC}"
echo -e ""
echo -e "查看详细文档: ${YELLOW}docs/LOCAL-DEV-SETUP-GUIDE.md${NC}"
echo ""
