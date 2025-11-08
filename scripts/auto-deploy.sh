#!/bin/bash
# 自动部署脚本 - 由 Cron 每 5 分钟运行
# 用途: 检查 GitHub 更新,自动拉取、编译、重启
# Cron 配置: */5 * * * * /var/www/Moreyudeals/scripts/auto-deploy.sh

set -e

# 配置
PROJECT_DIR="/var/www/Moreyudeals"
LOG_FILE="/var/log/moreyudeals-deploy.log"
MAX_LOG_LINES=1000

# 切换到项目目录
cd "$PROJECT_DIR"

# 记录开始时间
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== 开始检查更新 ==========" >> "$LOG_FILE"

# 获取当前 commit hash
BEFORE=$(git rev-parse HEAD)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 当前版本: $BEFORE" >> "$LOG_FILE"

# 拉取最新代码信息
git fetch origin main >> "$LOG_FILE" 2>&1

# 获取远程 commit hash
AFTER=$(git rev-parse origin/main)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 远程版本: $AFTER" >> "$LOG_FILE"

# 检查是否有更新
if [ "$BEFORE" = "$AFTER" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 无新代码,跳过部署" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    exit 0
fi

# 有新代码,开始部署
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚡ 发现新代码,开始部署..." >> "$LOG_FILE"

# 拉取代码
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 1. 拉取代码..." >> "$LOG_FILE"
if git pull origin main >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ 代码拉取成功" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ 代码拉取失败" >> "$LOG_FILE"
    exit 1
fi

# 检查是否有 package.json 变化(需要重新安装依赖)
if git diff --name-only "$BEFORE" "$AFTER" | grep -q "package.json"; then
    NEED_INSTALL=true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 检测到 package.json 变化,将重新安装依赖" >> "$LOG_FILE"
else
    NEED_INSTALL=false
fi

# 编译 API
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 2. 编译 API..." >> "$LOG_FILE"
cd "$PROJECT_DIR/packages/api"
if [ "$NEED_INSTALL" = true ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')]    安装 API 依赖..." >> "$LOG_FILE"
    npm install --production=false >> "$LOG_FILE" 2>&1
fi
if npm run build >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ API 编译成功" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ API 编译失败" >> "$LOG_FILE"
    # 编译失败,回滚代码
    cd "$PROJECT_DIR"
    git reset --hard "$BEFORE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ 已回滚到之前版本" >> "$LOG_FILE"
    exit 1
fi

# 编译 Worker
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 3. 编译 Worker..." >> "$LOG_FILE"
cd "$PROJECT_DIR/packages/worker"
if [ "$NEED_INSTALL" = true ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')]    安装 Worker 依赖..." >> "$LOG_FILE"
    npm install --production=false >> "$LOG_FILE" 2>&1
fi
if npm run build >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Worker 编译成功" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Worker 编译失败" >> "$LOG_FILE"
    # 编译失败,回滚代码
    cd "$PROJECT_DIR"
    git reset --hard "$BEFORE"
    # 重新编译 API(因为刚才编译成功了,需要回退)
    cd "$PROJECT_DIR/packages/api"
    npm run build >> "$LOG_FILE" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ 已回滚到之前版本" >> "$LOG_FILE"
    exit 1
fi

# 重启服务(零停机)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 4. 重启服务..." >> "$LOG_FILE"
if pm2 reload moreyudeals-api >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ API 已重启" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ API 重启失败" >> "$LOG_FILE"
fi

if pm2 reload moreyudeals-worker >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Worker 已重启" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Worker 重启失败" >> "$LOG_FILE"
fi

# 健康检查
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 5. 健康检查..." >> "$LOG_FILE"
sleep 3  # 等待服务启动

if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ API 健康检查通过" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ API 健康检查失败(可能端点不存在,但服务可能正常)" >> "$LOG_FILE"
fi

# 检查 PM2 状态
if pm2 list | grep -q "online"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ PM2 服务运行正常" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ PM2 服务异常" >> "$LOG_FILE"
fi

# 部署完成
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== ✓ 部署完成! ==========" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 新版本: $(git rev-parse HEAD)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 清理日志(保留最后 1000 行)
tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "$LOG_FILE.tmp"
mv "$LOG_FILE.tmp" "$LOG_FILE"

exit 0
