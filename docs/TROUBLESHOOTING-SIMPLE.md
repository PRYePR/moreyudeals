# Moreyudeals 故障排查指南

> 简化版自动部署系统的常见问题和解决方案

---

## 目录

1. [部署相关问题](#部署相关问题)
2. [PM2 进程问题](#pm2-进程问题)
3. [API 连接问题](#api-连接问题)
4. [数据库问题](#数据库问题)
5. [性能问题](#性能问题)
6. [紧急恢复](#紧急恢复)

---

## 部署相关问题

### ❌ 自动部署没有触发

**症状**: 推送代码到 GitHub 后,服务器没有自动更新

**诊断步骤**:

```bash
# 1. 检查 Cron 任务是否配置
crontab -l | grep auto-deploy

# 2. 查看部署日志
tail -f /var/log/moreyudeals-deploy.log

# 3. 手动运行部署脚本测试
bash /var/www/Moreyudeals/scripts/auto-deploy.sh
```

**可能原因和解决方案**:

#### 原因 1: Cron 任务未配置

```bash
# 添加 Cron 任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/Moreyudeals/scripts/auto-deploy.sh") | crontab -

# 验证
crontab -l
```

#### 原因 2: 脚本没有执行权限

```bash
chmod +x /var/www/Moreyudeals/scripts/auto-deploy.sh
```

#### 原因 3: Git 无法拉取代码(SSH 问题)

```bash
# 测试 GitHub SSH 连接
ssh -T git@github.com

# 如果失败,重新配置 SSH
bash /var/www/Moreyudeals/scripts/setup-github-ssh.sh
```

#### 原因 4: 脚本路径错误

```bash
# 检查脚本是否存在
ls -la /var/www/Moreyudeals/scripts/auto-deploy.sh

# 如果不存在,检查项目目录
cd /var/www/Moreyudeals
git pull origin main
```

---

### ❌ 编译失败,部署中断

**症状**: 部署日志显示编译错误

**查看详细错误**:

```bash
tail -n 100 /var/log/moreyudeals-deploy.log
```

**可能原因和解决方案**:

#### 原因 1: TypeScript 语法错误

```bash
# 手动编译查看详细错误
cd /var/www/Moreyudeals/packages/api
npm run build

cd /var/www/Moreyudeals/packages/worker
npm run build
```

**解决**:
- 在本地修复代码错误
- 推送修复后的代码
- 或回滚到上一个版本:
  ```bash
  bash /var/www/Moreyudeals/scripts/rollback.sh
  ```

#### 原因 2: 依赖包缺失或版本冲突

```bash
# 重新安装依赖
cd /var/www/Moreyudeals/packages/api
rm -rf node_modules package-lock.json
npm install

cd /var/www/Moreyudeals/packages/worker
rm -rf node_modules package-lock.json
npm install
```

#### 原因 3: Node.js 版本不兼容

```bash
# 检查 Node.js 版本
node --version
# 需要 v18+

# 如果版本太低,升级
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 原因 4: 磁盘空间不足

```bash
# 检查磁盘空间
df -h

# 如果空间不足,清理
npm cache clean --force
pm2 flush
sudo apt clean
```

---

### ❌ 部署后代码没有更新

**症状**: 部署成功,但运行的还是旧代码

**诊断**:

```bash
# 1. 检查 Git 版本
cd /var/www/Moreyudeals
git log -1 --oneline

# 2. 检查编译文件时间戳
ls -lt packages/api/dist/index.js
ls -lt packages/worker/dist/index.js

# 3. 查看 PM2 进程启动时间
pm2 list
```

**解决方案**:

```bash
# 强制重新部署
bash /var/www/Moreyudeals/scripts/manual-deploy.sh

# 或者手动重启
pm2 reload all
```

---

## PM2 进程问题

### ❌ PM2 进程状态是 "errored" 或 "stopped"

**症状**: `pm2 list` 显示进程不是 online 状态

**查看错误日志**:

```bash
pm2 logs moreyudeals-api --err --lines 50
pm2 logs moreyudeals-worker --err --lines 50
```

**常见错误和解决方案**:

#### 错误 1: `Error: listen EADDRINUSE :::3001`

**原因**: 端口 3001 被其他进程占用

```bash
# 查找占用端口的进程
sudo lsof -i :3001
# 或
sudo netstat -tuln | grep 3001

# 杀掉占用端口的进程
sudo kill -9 <PID>

# 重启 API
pm2 reload moreyudeals-api
```

#### 错误 2: `Error: connect ECONNREFUSED 43.157.40.96:5432`

**原因**: 无法连接数据库

```bash
# 测试数据库连接
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyudeals \
  -d moreyudeals \
  -c "SELECT 1;"
```

**可能原因**:
- 数据库服务器宕机
- 网络连接问题
- 防火墙阻止
- 数据库密码错误

**解决**:
- 检查数据库服务器状态
- 检查网络连通性: `ping 43.157.40.96`
- 检查防火墙规则
- 验证 `.env.production` 中的数据库配置

#### 错误 3: `Cannot find module './dist/index.js'`

**原因**: 编译文件不存在

```bash
# 重新编译
cd /var/www/Moreyudeals/packages/api
npm run build

cd /var/www/Moreyudeals/packages/worker
npm run build

# 重启
pm2 reload all
```

#### 错误 4: 进程频繁重启

```bash
# 查看重启次数
pm2 list
# 看 "restart" 列

# 查看详细信息
pm2 info moreyudeals-api
```

**可能原因**:
- 内存泄漏(超过 max_memory_restart)
- 代码抛出未捕获的异常
- 环境变量配置错误

**解决**:
```bash
# 增加内存限制
pm2 delete moreyudeals-api
# 编辑 ecosystem.config.js,增加 max_memory_restart
pm2 start ecosystem.config.js

# 查看进程内存使用
pm2 monit
```

---

### ❌ PM2 重启后进程丢失

**症状**: 服务器重启后 PM2 进程没有自动启动

**解决**:

```bash
# 1. 启动进程
cd /var/www/Moreyudeals/packages/api
pm2 start ecosystem.config.js

cd /var/www/Moreyudeals/packages/worker
pm2 start ecosystem.config.js

# 2. 保存 PM2 配置
pm2 save

# 3. 设置开机自启
pm2 startup
# 复制输出的命令并执行

# 4. 验证
sudo systemctl status pm2-root
```

---

## API 连接问题

### ❌ Vercel 前端无法连接 API

**症状**: 前端显示"无法连接服务器"或数据加载失败

**诊断步骤**:

```bash
# 1. 检查 API 是否运行
pm2 list | grep api

# 2. 测试 API 本地连接
curl http://localhost:3001/health

# 3. 测试 API 端点
curl -H "x-api-key: hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=" \
  http://localhost:3001/api/deals?limit=1

# 4. 检查 Cloudflare Tunnel 状态
sudo systemctl status cloudflared
# 或
ps aux | grep cloudflared
```

**可能原因和解决方案**:

#### 原因 1: API_KEY 不匹配

```bash
# 检查服务器 API_KEY
cat /var/www/Moreyudeals/packages/api/.env.production | grep API_KEY

# 应该是:
# API_KEY=hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=
```

**解决**: 确保 Vercel 环境变量中的 `API_KEY` 和服务器一致

#### 原因 2: CORS 配置错误

```bash
# 检查 ALLOWED_ORIGINS
cat /var/www/Moreyudeals/packages/api/.env.production | grep ALLOWED_ORIGINS

# 应该是:
# ALLOWED_ORIGINS=https://deals.moreyu.com
```

**解决**:
```bash
nano /var/www/Moreyudeals/packages/api/.env.production
# 修改 ALLOWED_ORIGINS
# 保存后重启 API
pm2 reload moreyudeals-api
```

#### 原因 3: Cloudflare Tunnel 未运行

```bash
# 检查 Tunnel 状态
sudo systemctl status cloudflared

# 如果没有运行,启动
sudo systemctl start cloudflared

# 设置开机自启
sudo systemctl enable cloudflared
```

#### 原因 4: Cloudflare Tunnel 配置错误

```bash
# 查看 Tunnel 配置
cat /etc/cloudflared/aa7532c9-6ad7-4971-8ec7-1315258c701d.json

# 或
sudo cloudflared tunnel info
```

确保配置中有:
```json
{
  "ingress": [
    {
      "hostname": "api.你的域名.com",
      "service": "http://localhost:3001"
    }
  ]
}
```

---

### ❌ API 返回 500 错误

**查看 API 日志**:

```bash
pm2 logs moreyudeals-api --err --lines 100
```

**常见原因**:
- 数据库查询错误
- 代码逻辑错误
- 环境变量缺失

**解决**:
- 根据日志修复代码
- 或回滚到稳定版本

---

## 数据库问题

### ❌ 数据库连接超时

**测试连接**:

```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyudeals \
  -d moreyudeals \
  -c "SELECT NOW();"
```

**如果超时**:

```bash
# 检查网络连通性
ping 43.157.40.96

# 检查端口是否开放
telnet 43.157.40.96 5432

# 检查防火墙
sudo ufw status
```

**解决**:
- 联系数据库服务器管理员
- 检查服务器 IP 是否在数据库白名单中
- 检查数据库服务器是否运行

---

### ❌ 数据库连接数过多

**症状**: API 日志显示 "too many connections"

**检查当前连接数**:

```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyudeals \
  -d moreyudeals \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

**解决**:

1. 重启 API 释放连接:
   ```bash
   pm2 reload moreyudeals-api
   ```

2. 如果经常出现,需要优化代码:
   - 使用连接池
   - 及时关闭连接
   - 减少 API 实例数

---

## 性能问题

### ❌ API 响应慢

**诊断**:

```bash
# 1. 检查服务器负载
top

# 2. 检查 PM2 进程 CPU/内存
pm2 monit

# 3. 测试 API 响应时间
time curl -H "x-api-key: hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=" \
  http://localhost:3001/api/deals?limit=10
```

**可能原因**:

#### 原因 1: 数据库查询慢

- 添加数据库索引
- 优化查询语句
- 减少返回的数据量

#### 原因 2: 服务器资源不足

```bash
# 检查 CPU
top

# 检查内存
free -h

# 检查磁盘 I/O
iostat -x 1 5
```

**解决**:
- 升级服务器配置
- 增加 PM2 实例数(如果 CPU 有余)
- 优化代码

#### 原因 3: PM2 实例数不合适

```bash
# 当前是 2 个实例
# 如果 CPU 是 4 核,可以增加到 4 个

# 编辑 ecosystem.config.js
nano /var/www/Moreyudeals/packages/api/ecosystem.config.js
# 修改 instances: 4

# 重启
pm2 delete moreyudeals-api
pm2 start /var/www/Moreyudeals/packages/api/ecosystem.config.js
pm2 save
```

---

### ❌ 内存占用过高

**查看内存使用**:

```bash
pm2 list
# 查看 memory 列

free -h
```

**解决**:

```bash
# 1. 减少 max_memory_restart
# 编辑 ecosystem.config.js
nano /var/www/Moreyudeals/packages/api/ecosystem.config.js
# 修改 max_memory_restart: '300M'

# 2. 重启
pm2 reload all

# 3. 如果还是占用高,可能有内存泄漏
# 查看代码,修复泄漏
```

---

## 紧急恢复

### 🆘 一切都挂了,快速恢复

```bash
# 1. 重启所有 PM2 进程
pm2 restart all

# 2. 如果还是不行,删除重建
pm2 delete all
cd /var/www/Moreyudeals/packages/api
pm2 start ecosystem.config.js
cd /var/www/Moreyudeals/packages/worker
pm2 start ecosystem.config.js
pm2 save

# 3. 如果还是不行,回滚代码
cd /var/www/Moreyudeals
bash scripts/rollback.sh

# 4. 如果还是不行,重新部署
bash scripts/manual-deploy.sh
```

---

### 🆘 回滚到已知稳定版本

```bash
cd /var/www/Moreyudeals

# 查看提交历史
git log --oneline -n 20

# 找到稳定版本的 commit hash (例如 abc123)
git reset --hard abc123

# 重新编译
cd packages/api && npm run build
cd ../worker && npm run build

# 重启
pm2 reload all
```

---

### 🆘 完全重建(最后手段)

```bash
# 1. 备份当前配置
cp /var/www/Moreyudeals/packages/api/.env.production /root/env-backup

# 2. 删除当前部署
pm2 delete all
rm -rf /var/www/Moreyudeals

# 3. 重新克隆
cd /var/www
git clone git@github.com:PRYePR/moreyudeals.git Moreyudeals
cd Moreyudeals

# 4. 恢复配置
cp /root/env-backup packages/api/.env.production

# 5. 安装依赖
cd packages/api && npm install && npm run build
cd ../worker && npm install && npm run build

# 6. 启动
pm2 start ecosystem.config.js
cd ../api
pm2 start ecosystem.config.js
pm2 save
```

---

## 日志位置汇总

```bash
# 部署日志
/var/log/moreyudeals-deploy.log

# PM2 API 日志
/var/www/Moreyudeals/logs/api-out.log
/var/www/Moreyudeals/logs/api-error.log

# PM2 Worker 日志
/var/www/Moreyudeals/logs/worker-out.log
/var/www/Moreyudeals/logs/worker-error.log

# PM2 系统日志
~/.pm2/logs/

# Cron 日志
/var/log/syslog (搜索 CRON)
```

---

## 获取帮助

如果以上都无法解决问题:

1. **收集信息**:
   ```bash
   bash /var/www/Moreyudeals/scripts/check-status.sh > ~/debug-info.txt
   pm2 logs --lines 100 >> ~/debug-info.txt
   tail -n 100 /var/log/moreyudeals-deploy.log >> ~/debug-info.txt
   ```

2. **查看完整指南**: [SIMPLE-AUTO-DEPLOY-GUIDE.md](./SIMPLE-AUTO-DEPLOY-GUIDE.md)

3. **检查 GitHub Issues**: https://github.com/PRYePR/moreyudeals/issues

---

**最重要的原则**: 遇到问题先查看日志!
- 部署问题 → `/var/log/moreyudeals-deploy.log`
- API 问题 → `pm2 logs moreyudeals-api`
- Worker 问题 → `pm2 logs moreyudeals-worker`
