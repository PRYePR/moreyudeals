# Moreyudeals 部署检查清单

**适用于**: Ubuntu 20.04+ 服务器部署

---

## 部署前检查

### 服务器准备

- [ ] 服务器基本信息
  - [ ] IP地址: _________________
  - [ ] SSH用户: _________________
  - [ ] SSH端口: _________ (默认22)
  - [ ] Root或sudo权限: 是 / 否

- [ ] 系统要求
  - [ ] Ubuntu 20.04+ 或 Debian 11+
  - [ ] 最小 2GB 内存
  - [ ] 最小 20GB 硬盘
  - [ ] 可以访问外网

### 安全组/防火墙

- [ ] SSH端口(22)已开放
- [ ] PostgreSQL端口(5432)仅本地访问
- [ ] (可选) HTTP/HTTPS(80/443)已开放

### 账号准备

- [ ] GitHub访问权限
- [ ] (可选) DeepL API Key: _________________

---

## 部署步骤

### 步骤 1: 环境安装 (30分钟)

```bash
# 连接服务器
ssh root@YOUR_SERVER_IP
```

- [ ] Node.js 18 安装完成
  ```bash
  node --version  # 应显示 v18.x.x
  ```

- [ ] PM2 安装完成
  ```bash
  pm2 --version
  ```

- [ ] PostgreSQL 15 安装完成
  ```bash
  sudo -u postgres psql -c "SELECT version();"
  ```

- [ ] Git 安装完成
  ```bash
  git --version
  ```

### 步骤 2: 数据库配置 (10分钟)

- [ ] 数据库已创建
  ```bash
  sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname='moreyudeals';"
  ```

- [ ] 数据库用户已创建
  ```bash
  sudo -u postgres psql -c "\du moreyudeals"
  ```

- [ ] 权限已授予
  ```bash
  sudo -u postgres psql -d moreyudeals -c "\dp"
  ```

- [ ] 迁移脚本已执行
  ```bash
  PGPASSWORD=338e930fbb psql -h localhost -U moreyudeals -d moreyudeals -c "\dt"
  # 应该看到: deals, data_sources
  ```

### 步骤 3: 代码部署 (15分钟)

- [ ] 代码已克隆到 `/www/wwwroot/Moreyudeals`
  ```bash
  ls -la /www/wwwroot/Moreyudeals
  ```

- [ ] 切换到正确分支
  ```bash
  cd /www/wwwroot/Moreyudeals
  git branch
  # 应该在 latest-2025 分支
  ```

- [ ] 依赖已安装
  ```bash
  cd packages/worker
  ls -la node_modules | wc -l
  # 应该有多个包
  ```

- [ ] 项目已构建
  ```bash
  ls -la dist/index.js
  # 应该存在
  ```

### 步骤 4: 配置文件 (5分钟)

- [ ] `.env.production` 已创建
  ```bash
  cat packages/worker/.env.production | grep DB_HOST
  ```

- [ ] 数据库密码已正确配置
  ```bash
  cat packages/worker/.env.production | grep DB_PASSWORD
  ```

- [ ] Sparhamster配置已设置
  ```bash
  cat packages/worker/.env.production | grep SPARHAMSTER_API_URL
  ```

- [ ] 日志目录已创建
  ```bash
  ls -la packages/worker/logs
  ```

### 步骤 5: 服务启动 (5分钟)

- [ ] PM2服务已启动
  ```bash
  pm2 list
  # 应该看到 moreyudeals-worker
  ```

- [ ] 服务状态为 online
  ```bash
  pm2 status | grep moreyudeals-worker
  # 应该显示 online
  ```

- [ ] PM2配置已保存
  ```bash
  ls ~/.pm2/dump.pm2
  # 应该存在
  ```

- [ ] 开机自启已设置
  ```bash
  systemctl status pm2-root
  # 或 pm2-YOUR_USER
  ```

---

## 部署验证

### 功能验证

- [ ] 数据库连接正常
  ```bash
  PGPASSWORD=338e930fbb psql -h localhost -U moreyudeals -d moreyudeals -c "SELECT 1;"
  # 应该返回 1
  ```

- [ ] Worker服务运行正常
  ```bash
  pm2 logs moreyudeals-worker --lines 20 --nostream
  # 应该看到: "✅ Worker 服务启动完成"
  ```

- [ ] 首次抓取成功
  ```bash
  pm2 logs moreyudeals-worker | grep "抓取任务完成"
  # 应该看到抓取统计
  ```

- [ ] 数据已入库
  ```bash
  PGPASSWORD=338e930fbb psql -h localhost -U moreyudeals -d moreyudeals \
    -c "SELECT COUNT(*) FROM deals;"
  # 应该 > 0
  ```

- [ ] 商家识别正常
  ```bash
  PGPASSWORD=338e930fbb psql -h localhost -U moreyudeals -d moreyudeals \
    -c "SELECT merchant, COUNT(*) FROM deals WHERE merchant IS NOT NULL GROUP BY merchant LIMIT 5;"
  # 应该看到真实商家，不是 "sparhamster"
  ```

### 性能验证

- [ ] 内存使用正常
  ```bash
  pm2 status
  # Memory 应该 < 500MB
  ```

- [ ] CPU使用正常
  ```bash
  pm2 monit
  # CPU 应该 < 10% (空闲时)
  ```

- [ ] 磁盘空间充足
  ```bash
  df -h /
  # 使用率应该 < 50%
  ```

### 日志验证

- [ ] 无错误日志
  ```bash
  pm2 logs moreyudeals-worker --err --lines 50 --nostream
  # 应该没有严重错误
  ```

- [ ] 日志文件正常
  ```bash
  ls -lh ~/.pm2/logs/moreyudeals-worker-*.log
  # 应该有 out.log 和 error.log
  ```

---

## 部署后配置

### 监控设置

- [ ] 定时备份已配置
  ```bash
  crontab -l | grep backup
  # 应该看到备份任务
  ```

- [ ] 健康检查已配置
  ```bash
  crontab -l | grep health-check
  # 应该看到健康检查任务
  ```

- [ ] 日志轮转已配置
  ```bash
  pm2 conf | grep logrotate
  ```

### 安全加固

- [ ] 防火墙已启用
  ```bash
  sudo ufw status
  # 应该显示 active
  ```

- [ ] PostgreSQL仅本地访问
  ```bash
  sudo netstat -plnt | grep 5432
  # 应该只监听 127.0.0.1
  ```

- [ ] SSH已加固
  ```bash
  cat /etc/ssh/sshd_config | grep PermitRootLogin
  # 建议: PermitRootLogin no
  ```

### 文档准备

- [ ] 数据库密码已记录
- [ ] DeepL API Key已记录 (如使用)
- [ ] SSH密钥已备份
- [ ] 服务器IP和登录信息已记录

---

## 常见命令备忘

```bash
# === 查看服务状态 ===
pm2 status
pm2 logs moreyudeals-worker -f

# === 重启服务 ===
pm2 restart moreyudeals-worker

# === 查看数据 ===
PGPASSWORD=338e930fbb psql -h localhost -U moreyudeals -d moreyudeals

# === 更新代码 ===
cd /www/wwwroot/Moreyudeals
bash scripts/update-server.sh

# === 查看资源 ===
htop
df -h
free -h
```

---

## 问题联系

如遇到问题，请检查:
1. PM2日志: `pm2 logs moreyudeals-worker --err`
2. 系统日志: `journalctl -u pm2-* -n 50`
3. PostgreSQL日志: `sudo tail -f /var/log/postgresql/*.log`
4. 部署文档: `DEPLOYMENT.md`

技术支持: support@moreyu.com

---

**部署完成日期**: ___________
**部署人员**: ___________
**服务器IP**: ___________
**备注**: ___________________________________________
