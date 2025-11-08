#!/bin/bash
# 状态检查脚本 - 检查所有服务状态
# 用途: 快速查看系统健康状况
# 使用: bash scripts/check-status.sh

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Moreyudeals 系统状态检查${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 1. PM2 进程状态
echo -e "${YELLOW}[1] PM2 进程状态${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 list
echo ""

# 2. Git 版本信息
echo -e "${YELLOW}[2] 当前部署版本${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd /var/www/Moreyudeals 2>/dev/null || cd /Users/prye/Documents/Moreyudeals
echo "本地版本:"
git log -1 --oneline --decorate
echo ""
echo "远程版本:"
git fetch origin main 2>/dev/null
git log origin/main -1 --oneline --decorate
echo ""
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null)
if [ "$BEHIND" -gt 0 ]; then
    echo -e "${YELLOW}⚠ 落后远程 $BEHIND 个提交${NC}"
else
    echo -e "${GREEN}✓ 已是最新版本${NC}"
fi
echo ""

# 3. API 健康检查
echo -e "${YELLOW}[3] API 健康检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API 运行正常 (http://localhost:3001/health)${NC}"
    RESPONSE=$(curl -s http://localhost:3001/health)
    echo "响应: $RESPONSE"
else
    echo -e "${YELLOW}⚠ API 健康端点无响应${NC}"
    echo "尝试检查端口..."
    if netstat -tuln 2>/dev/null | grep -q ":3001"; then
        echo -e "${GREEN}✓ 端口 3001 正在监听${NC}"
    else
        echo -e "${RED}✗ 端口 3001 未监听${NC}"
    fi
fi
echo ""

# 4. 数据库连接检查
echo -e "${YELLOW}[4] 数据库连接检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if command -v psql &> /dev/null; then
    if PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 数据库连接正常${NC}"
        DEAL_COUNT=$(PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -t -c "SELECT COUNT(*) FROM deals;" 2>/dev/null | xargs)
        echo "总优惠数: $DEAL_COUNT"
    else
        echo -e "${RED}✗ 数据库连接失败${NC}"
    fi
else
    echo -e "${YELLOW}⚠ psql 未安装,跳过数据库检查${NC}"
fi
echo ""

# 5. 磁盘空间
echo -e "${YELLOW}[5] 磁盘空间${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
df -h / | tail -n 1
DISK_USAGE=$(df / | tail -n 1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${RED}✗ 磁盘使用率过高: $DISK_USAGE%${NC}"
else
    echo -e "${GREEN}✓ 磁盘空间充足${NC}"
fi
echo ""

# 6. 内存使用
echo -e "${YELLOW}[6] 内存使用${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
free -h | grep Mem
echo ""

# 7. 最近部署日志
echo -e "${YELLOW}[7] 最近部署日志 (最后 10 行)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ -f /var/log/moreyudeals-deploy.log ]; then
    tail -n 10 /var/log/moreyudeals-deploy.log
else
    echo -e "${YELLOW}⚠ 未找到部署日志${NC}"
fi
echo ""

# 8. Cron 任务检查
echo -e "${YELLOW}[8] 自动部署 Cron 任务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if crontab -l 2>/dev/null | grep -q "auto-deploy.sh"; then
    echo -e "${GREEN}✓ Cron 任务已配置${NC}"
    crontab -l | grep "auto-deploy.sh"
else
    echo -e "${RED}✗ Cron 任务未配置${NC}"
    echo "运行此命令配置:"
    echo "  (crontab -l 2>/dev/null; echo '*/5 * * * * /var/www/Moreyudeals/scripts/auto-deploy.sh') | crontab -"
fi
echo ""

# 总结
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}状态检查完成${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "常用命令:"
echo "  查看实时日志: ${GREEN}pm2 logs${NC}"
echo "  查看部署日志: ${GREEN}tail -f /var/log/moreyudeals-deploy.log${NC}"
echo "  手动部署: ${GREEN}bash scripts/manual-deploy.sh${NC}"
echo "  回滚: ${GREEN}bash scripts/rollback.sh${NC}"
echo ""
