#!/bin/bash
# GitHub SSH 配置向导脚本
# 用途: 帮助新手配置 GitHub SSH 访问
# 使用: bash scripts/setup-github-ssh.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}GitHub SSH 配置向导${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 步骤 1: 检查是否已有 SSH 密钥
echo -e "${YELLOW}[1/5] 检查现有 SSH 密钥...${NC}"
if [ -f ~/.ssh/moreyudeals_deploy ]; then
    echo -e "${GREEN}✓ 发现现有密钥 ~/.ssh/moreyudeals_deploy${NC}"
    read -p "是否使用现有密钥? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "将生成新密钥..."
        ssh-keygen -t ed25519 -C "moreyudeals-server" -f ~/.ssh/moreyudeals_deploy -N ""
        echo -e "${GREEN}✓ 新密钥已生成${NC}"
    fi
else
    echo "生成新的 SSH 密钥..."
    ssh-keygen -t ed25519 -C "moreyudeals-server" -f ~/.ssh/moreyudeals_deploy -N ""
    echo -e "${GREEN}✓ SSH 密钥已生成${NC}"
fi
echo ""

# 步骤 2: 显示公钥
echo -e "${YELLOW}[2/5] 你的 SSH 公钥:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat ~/.ssh/moreyudeals_deploy.pub
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}请按照以下步骤添加到 GitHub:${NC}"
echo "1. 打开浏览器,访问: ${YELLOW}https://github.com/PRYePR/moreyudeals/settings/keys${NC}"
echo "2. 点击 '${GREEN}Add deploy key${NC}'"
echo "3. Title 填写: ${GREEN}Production Server${NC}"
echo "4. Key 粘贴上面的公钥 (从 ssh-ed25519 开始到最后)"
echo "5. ${RED}不要勾选${NC} 'Allow write access' (只读即可)"
echo "6. 点击 '${GREEN}Add key${NC}'"
echo ""
read -p "完成后按回车继续..." -r
echo ""

# 步骤 3: 配置 SSH config
echo -e "${YELLOW}[3/5] 配置 SSH...${NC}"
SSH_CONFIG=~/.ssh/config
if ! grep -q "Host github.com" "$SSH_CONFIG" 2>/dev/null; then
    cat >> "$SSH_CONFIG" << 'EOF'

# Moreyudeals GitHub 部署配置
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/moreyudeals_deploy
  StrictHostKeyChecking no
EOF
    echo -e "${GREEN}✓ SSH 配置已添加${NC}"
else
    echo -e "${YELLOW}⚠ SSH 配置已存在,跳过${NC}"
fi
chmod 600 "$SSH_CONFIG"
echo ""

# 步骤 4: 添加 GitHub 到 known_hosts
echo -e "${YELLOW}[4/5] 添加 GitHub 到信任列表...${NC}"
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
echo -e "${GREEN}✓ 已添加 GitHub 到信任列表${NC}"
echo ""

# 步骤 5: 测试连接
echo -e "${YELLOW}[5/5] 测试 GitHub SSH 连接...${NC}"
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓✓✓ 成功! GitHub SSH 已配置完成 ✓✓✓${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ 连接失败,请检查:${NC}"
    echo "1. GitHub Deploy Key 是否正确添加"
    echo "2. 公钥是否完整复制(不要有多余空格)"
    echo "3. 网络连接是否正常"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}下一步: 运行首次部署脚本${NC}"
echo -e "${YELLOW}bash scripts/initial-deploy.sh${NC}"
echo ""
