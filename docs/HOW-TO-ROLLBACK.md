# 回滚操作指南

> 当新部署出现问题时,如何快速回滚到稳定版本

---

## 🎯 何时需要回滚?

以下情况建议立即回滚:

- ✅ 新代码部署后 API 无法访问
- ✅ 前端显示错误或数据异常
- ✅ PM2 进程频繁崩溃重启
- ✅ 性能明显下降
- ✅ 数据库操作失败

---

## 📋 回滚方法汇总

### 方法 1: 使用回滚脚本(推荐)

**最简单,适合大多数情况**

```bash
cd /var/www/Moreyudeals
bash scripts/rollback.sh
```

**脚本会自动**:
1. 显示当前版本和目标版本
2. 询问确认
3. 回退 Git 代码到上一个 commit
4. 重新编译 API 和 Worker
5. 重启 PM2 服务
6. 验证服务状态

**示例输出**:

```
=========================================
Moreyudeals 回滚工具
=========================================

当前版本:
abc123d (HEAD -> main) fix: 修复某个 bug

将回滚到:
def456e feat: 添加新功能

确认回滚? (y/n)
```

---

### 方法 2: 回滚多个版本

**如果上一个版本也有问题**

```bash
# 回滚 2 个版本
bash scripts/rollback.sh 2

# 回滚 3 个版本
bash scripts/rollback.sh 3

# 回滚 5 个版本
bash scripts/rollback.sh 5
```

---

### 方法 3: 回滚到指定版本

**如果知道某个稳定版本的 commit hash**

#### 步骤 1: 查看提交历史

```bash
cd /var/www/Moreyudeals
git log --oneline -n 20
```

**输出示例**:

```
abc123d (HEAD -> main) fix: 修复某个 bug (有问题!)
def456e feat: 添加新功能 (有问题!)
789ghij fix: 紧急修复 (稳定!)  ← 想回滚到这个
012klmn feat: 用户管理功能
345nopq docs: 更新文档
```

#### 步骤 2: 回滚到指定 commit

```bash
# 使用完整的 commit hash 或前 7 位
git reset --hard 789ghij

# 重新编译
cd packages/api
npm run build

cd ../worker
npm run build

# 重启服务
pm2 reload all
```

#### 步骤 3: 验证

```bash
# 检查当前版本
git log -1 --oneline

# 检查服务状态
pm2 list

# 测试 API
curl http://localhost:3001/health
```

---

### 方法 4: 紧急回滚(最快)

**如果情况紧急,需要立即恢复服务**

```bash
cd /var/www/Moreyudeals

# 直接回退一个版本(不询问)
git reset --hard HEAD~1

# 快速重启(不重新编译,使用缓存)
pm2 reload all
```

⚠️ **注意**: 这个方法不重新编译,只适用于代码改动很小的情况。如果回滚后还是有问题,需要重新编译:

```bash
cd packages/api && npm run build
cd ../worker && npm run build
pm2 reload all
```

---

## 🔍 回滚后验证

### 1. 检查 Git 版本

```bash
cd /var/www/Moreyudeals
git log -1 --oneline --decorate
```

确认显示的是你期望的版本。

### 2. 检查 PM2 状态

```bash
pm2 list
```

确认所有进程都是 `online` 状态。

### 3. 检查 API 可用性

```bash
# 本地测试
curl http://localhost:3001/health

# 或测试实际接口
curl -H "x-api-key: hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=" \
  http://localhost:3001/api/deals?limit=1
```

### 4. 检查前端

打开浏览器访问: https://deals.moreyu.com

确认数据正常显示。

### 5. 查看日志

```bash
# 查看最近的日志,确认没有错误
pm2 logs --lines 50
```

---

## 📝 回滚后的常见问题

### ❌ 回滚后还是有问题

**可能原因**: 回滚的版本也有问题

**解决**:
```bash
# 继续回滚到更早的版本
bash scripts/rollback.sh 2

# 或查看历史,找到最后一个稳定版本
git log --oneline -n 30
git reset --hard <稳定版本的hash>
```

---

### ❌ PM2 进程无法启动

**可能原因**: 编译文件损坏

**解决**:
```bash
# 清理并重新编译
cd /var/www/Moreyudeals/packages/api
rm -rf dist
npm run build

cd ../worker
rm -rf dist
npm run build

# 重启
pm2 reload all
```

---

### ❌ 数据库迁移问题

**如果新版本执行了数据库迁移,回滚代码后可能不兼容**

**解决**:
1. **最好的办法**: 保持数据库向后兼容
2. **紧急情况**: 恢复数据库备份(需要提前备份)

**预防措施**:
```bash
# 在执行迁移前备份数据库
PGPASSWORD=bTXsPFtiLb7tNH87 pg_dump \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyudeals \
  -d moreyudeals \
  > ~/db-backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## 🚀 回滚后恢复到最新版本

**如果确认回滚后的版本稳定,想恢复到最新**

### 方法 1: 重新拉取 GitHub 最新代码

```bash
cd /var/www/Moreyudeals
git pull origin main

# 编译
cd packages/api && npm run build
cd ../worker && npm run build

# 重启
pm2 reload all
```

### 方法 2: 手动部署

```bash
bash /var/www/Moreyudeals/scripts/manual-deploy.sh
```

---

## 🛡️ 防止回滚的最佳实践

### 1. 本地充分测试

```bash
# 在本地运行测试
cd /Users/prye/Documents/Moreyudeals
npm test

# 本地编译检查
cd packages/api && npm run build
cd ../worker && npm run build
```

### 2. 使用 Git 标签标记稳定版本

```bash
# 在稳定版本打标签
git tag -a v1.0.0 -m "稳定版本 1.0.0"
git push origin v1.0.0

# 需要时回滚到标签
git reset --hard v1.0.0
```

### 3. 小步提交

- 每次只改动少量代码
- 提交信息清晰
- 方便定位问题和回滚

### 4. 保留部署日志

```bash
# 部署日志会自动保留在
tail -f /var/log/moreyudeals-deploy.log
```

### 5. 定期备份数据库

```bash
# 添加到 crontab,每天备份
0 2 * * * PGPASSWORD=bTXsPFtiLb7tNH87 pg_dump -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals > ~/backups/db-$(date +\%Y\%m\%d).sql
```

---

## 📊 回滚场景示例

### 场景 1: API 修复失败

```bash
# 推送了 bug 修复,但引入了新问题
git log --oneline -n 3
# abc123 (HEAD -> main) fix: 尝试修复 API 问题 (有新 bug!)
# def456 feat: 添加新功能
# 789ghi fix: 上一个稳定版本

# 回滚到上一个稳定版本
bash scripts/rollback.sh
```

### 场景 2: 性能问题

```bash
# 新代码导致 API 响应慢
# 检查发现是 N+1 查询问题

# 立即回滚
bash scripts/rollback.sh

# 然后在本地修复问题
# 修复后重新部署
```

### 场景 3: 数据库连接失败

```bash
# 新代码更新了数据库配置,导致连接失败
pm2 logs moreyudeals-api
# Error: connect ECONNREFUSED

# 回滚到之前的版本
bash scripts/rollback.sh

# 检查 .env.production 配置
cat /var/www/Moreyudeals/packages/api/.env.production
```

---

## ⚡ 快速参考

| 场景 | 命令 |
|------|------|
| 回滚 1 个版本 | `bash scripts/rollback.sh` |
| 回滚 3 个版本 | `bash scripts/rollback.sh 3` |
| 回滚到指定版本 | `git reset --hard <hash>` + 编译 + 重启 |
| 紧急快速回滚 | `git reset --hard HEAD~1 && pm2 reload all` |
| 查看提交历史 | `git log --oneline -n 20` |
| 恢复到最新 | `git pull origin main` + 编译 + 重启 |

---

## 🆘 紧急联系方式

如果回滚后还是无法恢复:

1. **查看故障排查文档**: [TROUBLESHOOTING-SIMPLE.md](./TROUBLESHOOTING-SIMPLE.md)
2. **收集诊断信息**:
   ```bash
   bash scripts/check-status.sh > ~/debug.txt
   pm2 logs --lines 200 >> ~/debug.txt
   ```
3. **完全重建**(最后手段): 参考故障排查文档的"完全重建"章节

---

**记住**: 回滚不是失败,是保护生产环境的安全机制!
