#!/bin/bash
# PostgreSQL 服务器配置脚本
# 在新服务器 43.157.40.96 上运行此脚本

set -e

echo "========================================="
echo "PostgreSQL 服务器配置脚本"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: 检查 PostgreSQL 是否已安装
echo -e "${YELLOW}[1/8] 检查 PostgreSQL 安装状态...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL 已安装${NC}"
    psql --version
else
    echo -e "${YELLOW}⚠ PostgreSQL 未安装，开始安装...${NC}"
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    echo -e "${GREEN}✓ PostgreSQL 安装完成${NC}"
fi
echo ""

# Step 2: 启动 PostgreSQL 服务
echo -e "${YELLOW}[2/8] 启动 PostgreSQL 服务...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql
echo -e "${GREEN}✓ PostgreSQL 服务已启动${NC}"
echo ""

# Step 3: 检查 PostgreSQL 版本
echo -e "${YELLOW}[3/8] 获取 PostgreSQL 版本...${NC}"
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo "PostgreSQL 版本: $PG_VERSION"
PG_CONF_DIR="/etc/postgresql/${PG_VERSION}/main"
echo "配置目录: $PG_CONF_DIR"
echo ""

# Step 4: 配置 PostgreSQL 允许远程连接
echo -e "${YELLOW}[4/8] 配置 PostgreSQL 远程访问...${NC}"

# 备份配置文件
sudo cp ${PG_CONF_DIR}/postgresql.conf ${PG_CONF_DIR}/postgresql.conf.backup
sudo cp ${PG_CONF_DIR}/pg_hba.conf ${PG_CONF_DIR}/pg_hba.conf.backup

# 修改 postgresql.conf
echo "修改 postgresql.conf..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" ${PG_CONF_DIR}/postgresql.conf
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" ${PG_CONF_DIR}/postgresql.conf

# 修改 pg_hba.conf - 添加远程访问规则
echo "修改 pg_hba.conf..."
if ! sudo grep -q "host.*all.*all.*0.0.0.0/0.*md5" ${PG_CONF_DIR}/pg_hba.conf; then
    echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a ${PG_CONF_DIR}/pg_hba.conf
fi

echo -e "${GREEN}✓ 配置文件修改完成${NC}"
echo ""

# Step 5: 创建数据库用户
echo -e "${YELLOW}[5/8] 创建数据库用户和数据库...${NC}"
sudo -u postgres psql <<EOF
-- 创建用户（如果不存在）
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'moreyudeals') THEN
        CREATE USER moreyudeals WITH PASSWORD 'bTXsPFtiLb7tNH87';
        RAISE NOTICE 'User moreyudeals created';
    ELSE
        RAISE NOTICE 'User moreyudeals already exists';
    END IF;
END
\$\$;

-- 创建数据库（如果不存在）
SELECT 'CREATE DATABASE moreyudeals OWNER moreyudeals'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'moreyudeals')\gexec

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE moreyudeals TO moreyudeals;

-- 允许用户创建数据库对象
\c moreyudeals
GRANT ALL ON SCHEMA public TO moreyudeals;
EOF

echo -e "${GREEN}✓ 数据库用户和数据库创建完成${NC}"
echo ""

# Step 6: 重启 PostgreSQL
echo -e "${YELLOW}[6/8] 重启 PostgreSQL 服务...${NC}"
sudo systemctl restart postgresql
sleep 3
echo -e "${GREEN}✓ PostgreSQL 服务已重启${NC}"
echo ""

# Step 7: 配置防火墙
echo -e "${YELLOW}[7/8] 配置防火墙...${NC}"

# 检查 ufw 是否已安装
if command -v ufw &> /dev/null; then
    echo "配置 ufw 防火墙..."
    sudo ufw allow 5432/tcp
    sudo ufw allow 22/tcp  # 确保 SSH 不被阻止

    # 如果防火墙未启用，询问是否启用
    if ! sudo ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}⚠ 防火墙未启用${NC}"
        echo "建议手动启用: sudo ufw enable"
    else
        echo -e "${GREEN}✓ 防火墙规则已添加${NC}"
    fi
else
    echo -e "${YELLOW}⚠ ufw 未安装，跳过防火墙配置${NC}"
    echo "请手动确保 5432 端口已开放"
fi
echo ""

# Step 8: 验证配置
echo -e "${YELLOW}[8/8] 验证配置...${NC}"

# 检查 PostgreSQL 是否监听所有 IP
echo "检查监听状态..."
sudo netstat -nltp | grep 5432 || sudo ss -nltp | grep 5432

# 测试本地连接
echo ""
echo "测试本地连接..."
PGPASSWORD=bTXsPFtiLb7tNH87 psql -h localhost -U moreyudeals -d moreyudeals -c "SELECT 'Connection successful!' as status;"

echo ""
echo "========================================="
echo -e "${GREEN}PostgreSQL 配置完成！${NC}"
echo "========================================="
echo ""
echo "数据库信息:"
echo "  主机: 43.157.40.96"
echo "  端口: 5432"
echo "  数据库: moreyudeals"
echo "  用户: moreyudeals"
echo "  密码: bTXsPFtiLb7tNH87"
echo ""
echo "下一步:"
echo "1. 从本地测试连接:"
echo "   PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c 'SELECT 1;'"
echo ""
echo "2. 如果连接成功，运行数据库初始化脚本:"
echo "   ./scripts/init-database.sh"
echo ""
echo "备份文件位置:"
echo "  ${PG_CONF_DIR}/postgresql.conf.backup"
echo "  ${PG_CONF_DIR}/pg_hba.conf.backup"
echo ""
