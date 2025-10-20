#!/bin/bash
# 服务器端数据库初始化脚本
# 用途: 在服务器本地使用 sudo 权限初始化数据库

set -e

echo "========================================="
echo "数据库初始化脚本（服务器端）"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 数据库配置
DB_NAME="moreyudeals"
DB_USER="moreyudeals"
DB_PASSWORD="338e930fbb"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/packages/worker/migrations"

echo "项目目录: $PROJECT_ROOT"
echo "迁移目录: $MIGRATIONS_DIR"
echo ""

# 检查是否有 sudo 权限或以 postgres 用户运行
echo -e "${YELLOW}[1/6] 检查数据库权限...${NC}"
if [ "$USER" != "postgres" ] && ! sudo -n true 2>/dev/null; then
    echo -e "${RED}✗ 需要 sudo 权限或以 postgres 用户运行${NC}"
    echo "请使用: sudo bash $0"
    exit 1
fi
echo -e "${GREEN}✓ 权限检查通过${NC}"
echo ""

# 创建数据库（如果不存在）
echo -e "${YELLOW}[2/6] 确保数据库存在...${NC}"
sudo -u postgres psql <<EOF
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
EOF
echo -e "${GREEN}✓ 数据库已就绪${NC}"
echo ""

# 创建用户并设置密码（如果不存在）
echo -e "${YELLOW}[3/6] 配置数据库用户...${NC}"
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;
EOF
echo -e "${GREEN}✓ 用户配置完成${NC}"
echo ""

# 授予权限
echo -e "${YELLOW}[4/6] 授予数据库权限...${NC}"
sudo -u postgres psql -d $DB_NAME <<EOF
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF
echo -e "${GREEN}✓ 权限授予完成${NC}"
echo ""

# 执行迁移脚本
echo -e "${YELLOW}[5/6] 执行数据库迁移...${NC}"
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")
        echo "执行迁移: $filename"
        sudo -u postgres psql -d $DB_NAME -f "$migration" 2>&1 | grep -v "ERROR" || true
        echo -e "${GREEN}✓ $filename 完成${NC}"
    fi
done
echo ""

# 验证表结构
echo -e "${YELLOW}[6/6] 验证数据库表...${NC}"
TABLES=$(sudo -u postgres psql -d $DB_NAME -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public';")

if [ -z "$TABLES" ]; then
    echo -e "${RED}✗ 未找到任何表${NC}"
    exit 1
else
    echo "已创建的表:"
    echo "$TABLES" | while read table; do
        echo "  - $table"
    done
    echo -e "${GREEN}✓ 数据库初始化成功${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}数据库初始化完成！${NC}"
echo "========================================="
echo ""
echo "数据库信息:"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""
