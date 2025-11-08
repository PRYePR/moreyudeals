# Moreyudeals 简化版自动部署完整指南

> **适用对象**: Linux 新手,Ubuntu 服务器
> **目标**: 实现 GitHub 代码推送后自动部署到服务器
> **特点**: 简单可靠,不需要复杂配置

---

## 📋 目录

1. [系统概述](#系统概述)
2. [前置准备](#前置准备)
3. [详细部署步骤](#详细部署步骤)
4. [验证部署](#验证部署)
5. [日常使用](#日常使用)
6. [常见问题](#常见问题)

---

## 系统概述

### 架构图

```
你的电脑                   GitHub                    服务器
   |                        |                         |
   |-- git push main -->    |                         |
                            |                         |
                            |  <-- Cron 每 5 分钟检查  |
                            |                         |
                            |  -- 拉取新代码 -->      |
                            |                         |
                                                      | 编译 TypeScript
                                                      | PM2 重启服务
                                                      ↓
                                                   零停机部署完成
```

### 工作流程

1. **你在本地修改代码** → `git push origin main`
2. **服务器 Cron 任务**(每 5 分钟) → 检查 GitHub 是否有新代码
3. **如果有新代码** → 自动拉取 → 编译 → 重启服务
4. **如果没有新代码** → 什么都不做

### 关键特性

✅ **零停机部署**: PM2 cluster 模式逐个重启实例
✅ **API_KEY 不变**: 环境变量独立管理,不受部署影响
✅ **自动回滚**: 编译失败自动回退代码
✅ **简单可靠**: 不依赖 Webhook,用系统 Cron 调度

---

## 前置准备

### 1. 服务器要求

- **操作系统**: Ubuntu 18.04+ (推荐 20.04 或 22.04)
- **CPU**: 2 核心以上
- **内存**: 4GB 以上
- **磁盘**: 20GB 以上可用空间
- **网络**: 能访问 GitHub

### 2. 需要安装的软件

检查是否已安装:

```bash
# Node.js (需要 v18+)
node --version

# npm
npm --version

# PM2
pm2 --version

# Git
git --version
```

如果没有安装,执行:

```bash
# 更新包列表
sudo apt update

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Git
sudo apt install -y git

# 安装 Yarn (可选,如果项目用 yarn)
sudo npm install -g yarn
```

### 3. 确认当前部署状态

```bash
# 查看当前运行的 PM2 进程
pm2 list

# 查看现有代码位置
ls -la /root/moreyudeals-api
ls -la /root/moreyudeals-worker
```

---

## 详细部署步骤

### 步骤 1: 准备部署脚本

#### 1.1 上传脚本到服务器

**方法 A: 从本地上传**(推荐)

在你的**本地电脑**上:

```bash
# 进入项目目录
cd /Users/prye/Documents/Moreyudeals

# 提交所有脚本到 Git
git add scripts/ packages/*/ecosystem.config.js packages/api/.env.production.example
git commit -m "feat: 添加自动部署脚本"
git push origin main
```

然后在**服务器**上,我们将在后续步骤中通过克隆仓库获取这些脚本。

**方法 B: 手动复制**(如果方法 A 有问题)

使用 `scp` 命令从本地上传到服务器:

```bash
# 在本地执行
scp -r scripts/ root@你的服务器IP:/root/
```

#### 1.2 创建必要的目录

在**服务器**上执行:

```bash
# 创建日志目录
sudo mkdir -p /var/log/moreyudeals
sudo chmod 755 /var/log/moreyudeals

# 创建 PM2 pid 文件目录
sudo mkdir -p /var/www/Moreyudeals/pids
sudo mkdir -p /var/www/Moreyudeals/logs
```

---

### 步骤 2: 配置 GitHub SSH 访问

#### 2.1 运行 SSH 配置脚本

如果你已经通过 Git 克隆了项目(方法 A),跳到步骤 3。
如果你手动上传了脚本(方法 B),执行:

```bash
cd /root/scripts
chmod +x setup-github-ssh.sh
bash setup-github-ssh.sh
```

#### 2.2 手动配置步骤(如果没有脚本)

```bash
# 1. 生成 SSH 密钥
ssh-keygen -t ed25519 -C "moreyudeals-server" -f ~/.ssh/moreyudeals_deploy
# 一路回车,不设置密码

# 2. 显示公钥
cat ~/.ssh/moreyudeals_deploy.pub
# 复制输出的内容(从 ssh-ed25519 开始到最后)

# 3. 添加到 GitHub
# 打开浏览器访问: https://github.com/PRYePR/moreyudeals/settings/keys
# 点击 "Add deploy key"
# Title: Production Server
# Key: 粘贴刚才复制的公钥
# 不勾选 "Allow write access"
# 点击 "Add key"

# 4. 配置 SSH config
nano ~/.ssh/config
```

在 `~/.ssh/config` 中添加:

```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/moreyudeals_deploy
  StrictHostKeyChecking no
```

保存并退出(Ctrl+O, Enter, Ctrl+X)

```bash
# 5. 设置权限
chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/moreyudeals_deploy

# 6. 添加 GitHub 到 known_hosts
ssh-keyscan github.com >> ~/.ssh/known_hosts

# 7. 测试连接
ssh -T git@github.com
# 应该显示: Hi PRYePR! You've successfully authenticated...
```

---

### 步骤 3: 首次部署

#### 3.1 下载部署脚本(如果还没有)

```bash
# 创建临时目录
mkdir -p /tmp/moreyudeals-setup
cd /tmp/moreyudeals-setup

# 克隆仓库获取脚本
git clone git@github.com:PRYePR/moreyudeals.git
cd moreyudeals

# 给脚本添加执行权限
chmod +x scripts/*.sh
```

#### 3.2 运行首次部署脚本

```bash
bash scripts/initial-deploy.sh
```

**脚本会自动执行以下操作**:

1. ✅ 检查必要软件(Git, Node.js, PM2)
2. ✅ 测试 GitHub SSH 连接
3. ✅ 备份旧的部署目录到 `/root/moreyudeals-backup-日期时间/`
4. ✅ 停止并删除旧的 PM2 进程
5. ✅ 克隆完整的 Git 仓库到 `/var/www/Moreyudeals`
6. ✅ 创建 `.env.production` 文件(包含你的 API_KEY)
7. ✅ 安装依赖
8. ✅ 编译 API 和 Worker
9. ✅ 启动 PM2 服务
10. ✅ 配置 Cron 自动部署任务
11. ✅ 设置 PM2 开机自启

**预计耗时**: 3-5 分钟

#### 3.3 可能遇到的问题

**问题 1**: `目标目录已存在: /var/www/Moreyudeals`

```bash
# 解决方案: 手动删除或重命名
sudo mv /var/www/Moreyudeals /var/www/Moreyudeals-old-$(date +%Y%m%d)
# 然后重新运行脚本
```

**问题 2**: `GitHub SSH 连接失败`

```bash
# 检查 SSH 密钥是否添加到 GitHub
ssh -T git@github.com -v
# 查看详细错误信息
```

**问题 3**: `npm install 失败`

```bash
# 可能是网络问题,尝试使用国内镜像
npm config set registry https://registry.npmmirror.com
# 然后重新运行脚本
```

---

### 步骤 4: 验证部署

#### 4.1 检查 PM2 状态

```bash
pm2 list
```

应该看到:

```
┌────┬────────────────────┬─────────┬─────────┬─────────┬──────────┬────────┬
│ id │ name               │ mode    │ status  │ cpu     │ memory   │ uptime │
├────┼────────────────────┼─────────┼─────────┼─────────┼──────────┼────────┼
│ 0  │ moreyudeals-api    │ cluster │ online  │ 0%      │ 50.0mb   │ 10s    │
│ 1  │ moreyudeals-api    │ cluster │ online  │ 0%      │ 50.0mb   │ 10s    │
│ 2  │ moreyudeals-worker │ fork    │ online  │ 0%      │ 80.0mb   │ 10s    │
└────┴────────────────────┴─────────┴─────────┴─────────┴──────────┴────────┴
```

✅ **status** 都是 **online**
✅ API 有 **2 个实例** (cluster 模式)
✅ Worker 有 **1 个实例** (fork 模式)

#### 4.2 检查 API 健康

```bash
curl http://localhost:3001/health
```

如果返回 JSON 数据或 "OK",说明 API 正常。

如果没有 `/health` 端点,测试其他端点:

```bash
# 测试获取优惠列表
curl -H "x-api-key: hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=" \
  http://localhost:3001/api/deals?limit=1
```

#### 4.3 检查 Vercel 前端连接

打开浏览器访问: https://deals.moreyu.com

如果能正常显示数据,说明前端和 API 连接成功!

#### 4.4 检查 Cron 任务

```bash
crontab -l
```

应该看到:

```
*/5 * * * * /var/www/Moreyudeals/scripts/auto-deploy.sh
```

#### 4.5 运行完整状态检查

```bash
cd /var/www/Moreyudeals
bash scripts/check-status.sh
```

这个脚本会检查:
- PM2 进程状态
- Git 版本信息
- API 健康
- 数据库连接
- 磁盘空间
- 内存使用
- 部署日志
- Cron 任务

---

## 日常使用

### 推送代码触发自动部署

在**本地电脑**上:

```bash
cd /Users/prye/Documents/Moreyudeals

# 修改代码...

# 提交并推送
git add .
git commit -m "fix: 修复某个 bug"
git push origin main
```

**然后等待 5 分钟**(最多),服务器会自动:
1. 检测到新代码
2. 拉取代码
3. 编译 API 和 Worker
4. 重启服务(零停机)

### 查看部署日志

```bash
# 实时查看部署日志
tail -f /var/log/moreyudeals-deploy.log

# 查看最近 50 行
tail -n 50 /var/log/moreyudeals-deploy.log
```

**日志示例**:

```
[2025-11-08 14:35:01] ========== 开始检查更新 ==========
[2025-11-08 14:35:01] 当前版本: a1b2c3d
[2025-11-08 14:35:02] 远程版本: e4f5g6h
[2025-11-08 14:35:02] ⚡ 发现新代码,开始部署...
[2025-11-08 14:35:03] 1. 拉取代码...
[2025-11-08 14:35:05] ✓ 代码拉取成功
[2025-11-08 14:35:05] 2. 编译 API...
[2025-11-08 14:35:15] ✓ API 编译成功
[2025-11-08 14:35:15] 3. 编译 Worker...
[2025-11-08 14:35:25] ✓ Worker 编译成功
[2025-11-08 14:35:25] 4. 重启服务...
[2025-11-08 14:35:28] ✓ API 已重启
[2025-11-08 14:35:30] ✓ Worker 已重启
[2025-11-08 14:35:30] 5. 健康检查...
[2025-11-08 14:35:33] ✓ API 健康检查通过
[2025-11-08 14:35:33] ✓ PM2 服务运行正常
[2025-11-08 14:35:33] ========== ✓ 部署完成! ==========
[2025-11-08 14:35:33] 新版本: e4f5g6h
```

### 手动立即部署(不等 Cron)

```bash
cd /var/www/Moreyudeals
bash scripts/manual-deploy.sh
```

### 查看 PM2 日志

```bash
# 查看所有日志
pm2 logs

# 只看 API 日志
pm2 logs moreyudeals-api

# 只看 Worker 日志
pm2 logs moreyudeals-worker

# 查看最近 100 行
pm2 logs --lines 100
```

### 重启服务

```bash
# 重启所有服务(零停机)
pm2 reload all

# 只重启 API
pm2 reload moreyudeals-api

# 只重启 Worker
pm2 reload moreyudeals-worker
```

### 停止服务

```bash
# 停止所有服务
pm2 stop all

# 停止 API
pm2 stop moreyudeals-api

# 停止 Worker
pm2 stop moreyudeals-worker
```

### 启动服务

```bash
# 启动所有服务
pm2 start all

# 或者分别启动
cd /var/www/Moreyudeals/packages/api
pm2 start ecosystem.config.js

cd /var/www/Moreyudeals/packages/worker
pm2 start ecosystem.config.js
```

---

## 回滚操作

### 回滚到上一个版本

```bash
cd /var/www/Moreyudeals
bash scripts/rollback.sh
```

脚本会:
1. 显示当前版本和将要回滚到的版本
2. 询问确认
3. 回退代码
4. 重新编译
5. 重启服务

### 回滚多个版本

```bash
# 回滚 2 个版本
bash scripts/rollback.sh 2

# 回滚 3 个版本
bash scripts/rollback.sh 3
```

### 查看提交历史

```bash
cd /var/www/Moreyudeals
git log --oneline -n 10
```

### 回滚到指定版本

```bash
cd /var/www/Moreyudeals

# 查看提交历史,找到目标 commit hash
git log --oneline

# 回滚到指定 commit (例如 abc123)
git reset --hard abc123

# 重新编译和重启
cd packages/api && npm run build
cd ../worker && npm run build
pm2 reload all
```

---

## 常见问题

### 1. 自动部署没有触发?

**检查 Cron 任务**:

```bash
# 查看 Cron 配置
crontab -l

# 如果没有,手动添加
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/Moreyudeals/scripts/auto-deploy.sh") | crontab -
```

**检查脚本权限**:

```bash
chmod +x /var/www/Moreyudeals/scripts/auto-deploy.sh
```

**手动运行测试**:

```bash
bash /var/www/Moreyudeals/scripts/auto-deploy.sh
```

### 2. PM2 进程总是重启?

**查看错误日志**:

```bash
pm2 logs moreyudeals-api --err
pm2 logs moreyudeals-worker --err
```

**常见原因**:
- 数据库连接失败
- 端口被占用
- 内存不足
- 代码有错误

**检查端口占用**:

```bash
netstat -tuln | grep 3001
```

**检查内存**:

```bash
free -h
```

### 3. API_KEY 改变了?

**检查 .env.production 文件**:

```bash
cat /var/www/Moreyudeals/packages/api/.env.production
```

确认 `API_KEY` 是:

```
API_KEY=hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=
```

如果不对,手动修改:

```bash
nano /var/www/Moreyudeals/packages/api/.env.production
```

修改后重启:

```bash
pm2 reload moreyudeals-api
```

### 4. Vercel 前端无法连接 API?

**检查 CORS 配置**:

```bash
cat /var/www/Moreyudeals/packages/api/.env.production
```

确认 `ALLOWED_ORIGINS` 是:

```
ALLOWED_ORIGINS=https://deals.moreyu.com
```

**检查 Cloudflare Tunnel**:

```bash
# 查看 Cloudflare Tunnel 状态
sudo systemctl status cloudflared
# 或
ps aux | grep cloudflared
```

### 5. 编译失败?

**查看部署日志**:

```bash
tail -f /var/log/moreyudeals-deploy.log
```

**常见原因**:
- TypeScript 语法错误
- 依赖包版本冲突
- Node.js 版本不兼容

**手动编译测试**:

```bash
cd /var/www/Moreyudeals/packages/api
npm run build

cd ../worker
npm run build
```

### 6. 磁盘空间不足?

**检查磁盘使用**:

```bash
df -h
```

**清理 npm 缓存**:

```bash
npm cache clean --force
```

**清理旧的 PM2 日志**:

```bash
pm2 flush
```

**清理旧备份**:

```bash
rm -rf /root/moreyudeals-backup-*
```

### 7. 数据库连接失败?

**测试数据库连接**:

```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyudeals \
  -d moreyudeals \
  -c "SELECT 1;"
```

**检查防火墙**:

```bash
sudo ufw status
```

### 8. 如何更改自动部署频率?

**编辑 Cron 配置**:

```bash
crontab -e
```

修改:
- `*/5 * * * *` = 每 5 分钟
- `*/3 * * * *` = 每 3 分钟
- `*/10 * * * *` = 每 10 分钟
- `*/1 * * * *` = 每 1 分钟

---

## 维护建议

### 每周检查

```bash
# 运行状态检查
bash /var/www/Moreyudeals/scripts/check-status.sh

# 查看 PM2 状态
pm2 list

# 查看最近部署日志
tail -n 50 /var/log/moreyudeals-deploy.log
```

### 每月维护

```bash
# 更新 PM2
sudo npm install -g pm2@latest

# 更新系统包
sudo apt update && sudo apt upgrade -y

# 清理旧日志
pm2 flush

# 检查磁盘空间
df -h
```

### 备份重要配置

定期备份:
- `/var/www/Moreyudeals/packages/api/.env.production`
- `/var/www/Moreyudeals/packages/worker/ecosystem.config.js`
- Cron 配置: `crontab -l > ~/crontab-backup.txt`

---

## 总结

✅ **配置完成后**,你只需要:
1. 在本地修改代码
2. `git push origin main`
3. 等待最多 5 分钟
4. 服务器自动部署完成!

✅ **零维护**: 除了偶尔查看日志,基本不需要手动操作

✅ **安全可靠**: API_KEY 不会变,Vercel 前端不受影响

---

**有问题?** 查看 [故障排查文档](./TROUBLESHOOTING-SIMPLE.md)
