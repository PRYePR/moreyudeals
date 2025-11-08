#!/bin/bash
# 数据库重置并重新抓取脚本
# 用途: 清空数据库并重新从源站抓取数据

set -e

echo "========================================="
echo "数据库重置 & 重新抓取数据"
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

# 加载环境变量
if [ -f "$WORKER_DIR/.env.production" ]; then
    export $(grep -v '^#' "$WORKER_DIR/.env.production" | xargs)
    echo -e "${GREEN}✓ 已加载生产环境配置${NC}"
elif [ -f "$WORKER_DIR/.env" ]; then
    export $(grep -v '^#' "$WORKER_DIR/.env" | xargs)
    echo -e "${GREEN}✓ 已加载开发环境配置${NC}"
else
    echo -e "${RED}✗ 未找到环境配置文件${NC}"
    exit 1
fi

# 数据库配置
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-moreyudeals}
DB_USER=${DB_USER:-moreyudeals}
DB_PASSWORD=${DB_PASSWORD}

echo ""
echo "数据库信息:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 确认操作
echo -e "${RED}⚠️  警告: 此操作将删除所有现有数据!${NC}"
read -p "确认要清空数据库并重新抓取吗? (输入 'yes' 确认): " confirm

if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""

# 1. 停止 Worker 服务 (如果使用PM2)
echo -e "${YELLOW}[1/5] 停止 Worker 服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop moreyudeals-worker 2>/dev/null || echo "服务未运行"
    echo -e "${GREEN}✓ 服务已停止${NC}"
else
    echo -e "${YELLOW}⊘ 未使用 PM2, 请手动停止服务${NC}"
fi
echo ""

# 2. 清空数据库表
echo -e "${YELLOW}[2/5] 清空数据库表...${NC}"

# 检查是否有sudo权限访问postgres用户
if [ -n "$DB_PASSWORD" ]; then
    # 使用密码连接
    export PGPASSWORD=$DB_PASSWORD

    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
-- 清空deals表
TRUNCATE TABLE deals RESTART IDENTITY CASCADE;

-- 清空data_sources表
TRUNCATE TABLE data_sources RESTART IDENTITY CASCADE;

-- 清空categories表 (如果需要)
-- TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

-- 验证
SELECT
    'deals' as table_name, COUNT(*) as count FROM deals
UNION ALL
SELECT
    'data_sources' as table_name, COUNT(*) as count FROM data_sources;
EOF

    unset PGPASSWORD
else
    # 使用sudo权限
    sudo -u postgres psql -d $DB_NAME <<EOF
-- 清空deals表
TRUNCATE TABLE deals RESTART IDENTITY CASCADE;

-- 清空data_sources表
TRUNCATE TABLE data_sources RESTART IDENTITY CASCADE;

-- 验证
SELECT
    'deals' as table_name, COUNT(*) as count FROM deals
UNION ALL
SELECT
    'data_sources' as table_name, COUNT(*) as count FROM data_sources;
EOF
fi

echo -e "${GREEN}✓ 数据库已清空${NC}"
echo ""

# 3. 清理 Redis 缓存 (如果启用)
echo -e "${YELLOW}[3/5] 清理缓存...${NC}"
if [ -n "$REDIS_URL" ] && command -v redis-cli &> /dev/null; then
    redis-cli FLUSHDB
    echo -e "${GREEN}✓ Redis 缓存已清空${NC}"
else
    echo -e "${YELLOW}⊘ Redis 未配置或未安装${NC}"
fi
echo ""

# 4. 手动运行一次抓取
echo -e "${YELLOW}[4/5] 开始抓取数据...${NC}"
echo "这可能需要几分钟时间..."
echo ""

cd "$WORKER_DIR"

# 使用环境变量强制启用翻译，保持与线上一致
export TRANSLATION_ENABLED=true

if [ -f "dist/index.js" ]; then
    # 如果已编译,直接运行
    timeout 120 node dist/index.js || true
else
    # 否则使用ts-node
    timeout 120 npx tsx src/index.ts || true
fi

echo ""
echo -e "${GREEN}✓ 数据抓取完成${NC}"
echo ""

# 5. 验证数据
echo -e "${YELLOW}[5/5] 验证抓取结果...${NC}"

if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD=$DB_PASSWORD

    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
-- 统计抓取的数据
SELECT
    COUNT(*) as total_deals,
    COUNT(DISTINCT merchant) as unique_merchants,
    MIN(created_at) as first_deal,
    MAX(created_at) as last_deal
FROM deals;

-- 显示最新的5条数据
SELECT
    id,
    LEFT(title, 60) as title,
    merchant,
    price,
    created_at
FROM deals
ORDER BY created_at DESC
LIMIT 5;
EOF

    unset PGPASSWORD
else
    sudo -u postgres psql -d $DB_NAME <<EOF
-- 统计抓取的数据
SELECT
    COUNT(*) as total_deals,
    COUNT(DISTINCT merchant) as unique_merchants,
    MIN(created_at) as first_deal,
    MAX(created_at) as last_deal
FROM deals;

-- 显示最新的5条数据
SELECT
    id,
    LEFT(title, 60) as title,
    merchant,
    price,
    created_at
FROM deals
ORDER BY created_at DESC
LIMIT 5;
EOF
fi

echo ""

# 询问是否重启服务
echo -e "${YELLOW}是否重启 Worker 服务?${NC}"
read -p "(y/n, 默认: y): " restart_service

if [ -z "$restart_service" ] || [ "$restart_service" = "y" ] || [ "$restart_service" = "Y" ]; then
    if command -v pm2 &> /dev/null; then
        pm2 restart moreyudeals-worker 2>/dev/null || pm2 start "$WORKER_DIR/ecosystem.config.js" --env production
        echo -e "${GREEN}✓ 服务已重启${NC}"
    else
        echo -e "${YELLOW}⊘ 请手动启动服务${NC}"
    fi
fi

echo ""
echo "========================================="
echo -e "${GREEN}重置完成！${NC}"
echo "========================================="
echo ""
echo "后续操作:"
echo "  - 查看服务日志: pm2 logs moreyudeals-worker"
echo "  - 启用翻译: 修改 .env.production 中的 TRANSLATION_ENABLED=true"
echo "  - 监控服务: pm2 monit"
echo ""
