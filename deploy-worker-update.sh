#!/bin/bash
# Moreyudeals Worker - 商家提取优化版本部署脚本
# 用途: 更新服务器上的Worker到最新版本(API-Only商家提取)
#
# 使用方法:
# 1. 上传此脚本到服务器
# 2. chmod +x deploy-worker-update.sh
# 3. ./deploy-worker-update.sh

set -e  # 遇到错误立即退出

echo "========================================="
echo "Moreyudeals Worker 部署脚本"
echo "版本: API-Only 商家提取优化版"
echo "========================================="
echo ""

# 配置变量
WORKER_DIR="/var/www/Moreyudeals"  # Worker代码目录(根据实际情况修改)
PM2_APP_NAME="moreyudeals-worker"   # PM2应用名称
GIT_BRANCH="latest-2025"            # Git分支

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤1: 检查目录
echo -e "${YELLOW}[1/8] 检查Worker目录...${NC}"
if [ ! -d "$WORKER_DIR" ]; then
    echo -e "${RED}错误: Worker目录不存在: $WORKER_DIR${NC}"
    echo "请修改脚本中的 WORKER_DIR 变量"
    exit 1
fi
cd "$WORKER_DIR"
echo -e "${GREEN}✓ 目录检查完成${NC}"
echo ""

# 步骤2: 备份当前代码
echo -e "${YELLOW}[2/8] 备份当前代码...${NC}"
BACKUP_DIR="/tmp/moreyudeals-backup-$(date +%Y%m%d_%H%M%S)"
cp -r "$WORKER_DIR" "$BACKUP_DIR"
echo -e "${GREEN}✓ 备份完成: $BACKUP_DIR${NC}"
echo ""

# 步骤3: 停止PM2进程
echo -e "${YELLOW}[3/8] 停止PM2进程...${NC}"
if pm2 list | grep -q "$PM2_APP_NAME"; then
    pm2 stop "$PM2_APP_NAME" || echo "进程已停止或不存在"
    pm2 delete "$PM2_APP_NAME" || echo "删除进程失败或不存在"
    echo -e "${GREEN}✓ PM2进程已停止${NC}"
else
    echo -e "${YELLOW}⚠ PM2进程不存在,跳过${NC}"
fi
echo ""

# 步骤4: 拉取最新代码
echo -e "${YELLOW}[4/8] 拉取最新代码...${NC}"
git fetch origin
git checkout "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"
echo -e "${GREEN}✓ 代码更新完成${NC}"
echo ""

# 步骤5: 安装依赖
echo -e "${YELLOW}[5/8] 安装/更新依赖...${NC}"
cd packages/worker
npm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤6: 编译TypeScript
echo -e "${YELLOW}[6/8] 编译TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ 编译完成${NC}"
echo ""

# 步骤7: 执行数据库迁移(如果需要)
echo -e "${YELLOW}[7/8] 检查数据库迁移...${NC}"
if [ -f "migrations/005_add_price_update_fields.sql" ]; then
    echo "发现新迁移文件,请手动执行:"
    echo ""
    echo "  PGPASSWORD=bTXsPFtiLb7tNH87 psql \\"
    echo "    -h 43.157.22.182 \\"
    echo "    -p 5432 \\"
    echo "    -U moreyu_admin \\"
    echo "    -d moreyudeals \\"
    echo "    -f migrations/005_add_price_update_fields.sql"
    echo ""
    read -p "是否已执行迁移? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}请先执行迁移,然后重新运行此脚本${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 数据库迁移检查完成${NC}"
echo ""

# 步骤8: 启动PM2进程
echo -e "${YELLOW}[8/8] 启动Worker...${NC}"

# 创建PM2 ecosystem配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'moreyudeals-worker',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      TRANSLATION_ENABLED: 'false',
      DB_HOST: '43.157.22.182',
      DB_PORT: '5432',
      DB_NAME: 'moreyudeals',
      DB_USER: 'moreyu_admin',
      DB_PASSWORD: 'bTXsPFtiLb7tNH87',
      SPARHAMSTER_API_URL: 'https://www.sparhamster.at/wp-json/wp/v2/posts',
      SPARHAMSTER_API_LIMIT: '40',
      SPARHAMSTER_TOKEN: '0ccb1264cd81ad8e20f27dd146dfa37d',
      SPARHAMSTER_USER_AGENT: 'Mozilla/5.0 (compatible; MoreYuDeals/1.0)'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 启动PM2
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ Worker启动完成${NC}"
echo ""

# 步骤9: 验证部署
echo "========================================="
echo -e "${GREEN}部署完成!${NC}"
echo "========================================="
echo ""
echo "验证步骤:"
echo "1. 查看PM2状态:"
echo "   pm2 list"
echo ""
echo "2. 查看实时日志:"
echo "   pm2 logs $PM2_APP_NAME"
echo ""
echo "3. 手动触发一次抓取(测试):"
echo "   cd $WORKER_DIR/packages/worker"
echo "   TRANSLATION_ENABLED=false npx tsx src/index.ts"
echo ""
echo "4. 检查数据库最新记录:"
echo "   PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.22.182 -p 5432 -U moreyu_admin -d moreyudeals -c \"SELECT title, merchant, LEFT(merchant_link, 60) FROM deals ORDER BY created_at DESC LIMIT 5;\""
echo ""
echo "5. 验证商家覆盖率:"
echo "   PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.22.182 -p 5432 -U moreyu_admin -d moreyudeals -c \"SELECT COUNT(*) as total, COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant, ROUND(100.0 * COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) / COUNT(*), 1) as percentage FROM deals WHERE created_at > NOW() - INTERVAL '1 hour';\""
echo ""
echo "备份位置: $BACKUP_DIR"
echo ""
echo "如果出现问题,可以回滚:"
echo "  pm2 stop $PM2_APP_NAME"
echo "  rm -rf $WORKER_DIR"
echo "  cp -r $BACKUP_DIR $WORKER_DIR"
echo "  cd $WORKER_DIR/packages/worker"
echo "  pm2 start ecosystem.config.js"
echo ""
