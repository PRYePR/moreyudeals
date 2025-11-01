#!/bin/bash
# 修复 PostgreSQL 只监听本机的问题

set -e

echo "========================================="
echo "修复 PostgreSQL 监听配置"
echo "========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检测 PostgreSQL 版本
echo -e "${YELLOW}[1/5] 检测 PostgreSQL 版本...${NC}"
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo "PostgreSQL 版本: $PG_VERSION"

# 查找配置文件位置
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

if [ ! -f "$PG_CONF" ]; then
    echo -e "${RED}错误: 找不到配置文件 $PG_CONF${NC}"
    echo "尝试查找配置文件..."
    sudo find /etc/postgresql -name postgresql.conf
    exit 1
fi

echo "配置文件位置:"
echo "  postgresql.conf: $PG_CONF"
echo "  pg_hba.conf: $PG_HBA"
echo ""

# 备份原配置文件
echo -e "${YELLOW}[2/5] 备份配置文件...${NC}"
sudo cp $PG_CONF ${PG_CONF}.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PG_HBA ${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ 配置文件已备份${NC}"
echo ""

# 修改 postgresql.conf
echo -e "${YELLOW}[3/5] 修改 postgresql.conf...${NC}"

# 检查当前 listen_addresses 设置
CURRENT_LISTEN=$(sudo grep -E "^listen_addresses|^#listen_addresses" $PG_CONF | head -1)
echo "当前配置: $CURRENT_LISTEN"

# 移除所有 listen_addresses 配置
sudo sed -i '/^listen_addresses/d' $PG_CONF
sudo sed -i '/^#listen_addresses/d' $PG_CONF

# 在文件开头添加新配置
sudo sed -i "1i listen_addresses = '*'" $PG_CONF

echo "新配置: listen_addresses = '*'"
echo -e "${GREEN}✓ postgresql.conf 已修改${NC}"
echo ""

# 修改 pg_hba.conf
echo -e "${YELLOW}[4/5] 修改 pg_hba.conf...${NC}"

# 检查是否已存在远程访问规则
if sudo grep -q "host.*all.*all.*0.0.0.0/0.*md5" $PG_HBA; then
    echo "远程访问规则已存在"
else
    echo "添加远程访问规则..."
    # 在 IPv4 local connections 之后添加
    sudo sed -i '/# IPv4 local connections:/a host    all             all             0.0.0.0/0               md5' $PG_HBA
    echo -e "${GREEN}✓ 已添加远程访问规则${NC}"
fi

echo ""
echo "当前 pg_hba.conf 配置:"
sudo grep -v "^#" $PG_HBA | grep -v "^$"
echo ""

# 重启 PostgreSQL
echo -e "${YELLOW}[5/5] 重启 PostgreSQL 服务...${NC}"
sudo systemctl restart postgresql

# 等待服务启动
sleep 3

# 检查服务状态
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓ PostgreSQL 服务重启成功${NC}"
else
    echo -e "${RED}✗ PostgreSQL 服务启动失败${NC}"
    echo "查看错误日志:"
    sudo journalctl -u postgresql -n 50
    exit 1
fi
echo ""

# 验证监听状态
echo "========================================="
echo "验证配置"
echo "========================================="
echo ""

echo "检查监听端口..."
sudo netstat -nltp 2>/dev/null | grep 5432 || sudo ss -nltp | grep 5432

echo ""
echo "当前配置摘要:"
sudo grep "^listen_addresses" $PG_CONF
echo ""

echo -e "${GREEN}✓ PostgreSQL 现在应该监听所有网络接口${NC}"
echo ""

echo "测试本地连接..."
if PGPASSWORD=bTXsPFtiLb7tNH87 psql -h localhost -U moreyudeals -d moreyudeals -c "SELECT 'OK' as status;" 2>/dev/null; then
    echo -e "${GREEN}✓ 本地连接成功${NC}"
else
    echo -e "${RED}✗ 本地连接失败${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}配置完成！${NC}"
echo "========================================="
echo ""
echo "下一步:"
echo "1. 确保防火墙允许 5432 端口:"
echo "   sudo ufw allow 5432/tcp"
echo "   sudo ufw status"
echo ""
echo "2. 从远程测试连接:"
echo "   PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -U moreyudeals -d moreyudeals -c 'SELECT 1;'"
echo ""
echo "如果仍然无法连接，检查:"
echo "- 云服务商的安全组/防火墙规则"
echo "- 服务器本地防火墙 (ufw/iptables)"
echo "- PostgreSQL 日志: sudo tail -f /var/log/postgresql/postgresql-${PG_VERSION}-main.log"
echo ""
