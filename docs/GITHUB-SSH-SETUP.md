# 服务器访问GitHub私有仓库配置指南

## 方法一：SSH密钥认证（推荐）

### 1. 在服务器上生成SSH密钥

```bash
# SSH登录到你的服务器
ssh root@43.157.40.96

# 生成SSH密钥（直接回车，不设置密码）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 查看生成的公钥
cat ~/.ssh/id_ed25519.pub
```

复制输出的公钥内容（以 `ssh-ed25519` 开头的整行）

### 2. 添加SSH密钥到GitHub

1. 访问 GitHub: https://github.com/settings/keys
2. 点击 **"New SSH key"**
3. 标题填写: `Moreyudeals Server`
4. 密钥类型: **Authentication Key**
5. 粘贴刚才复制的公钥
6. 点击 **"Add SSH key"**

### 3. 测试SSH连接

```bash
# 在服务器上测试
ssh -T git@github.com

# 应该看到：
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

### 4. 克隆仓库（使用SSH地址）

```bash
cd /www/wwwroot

# 使用SSH地址克隆（不是HTTPS）
git clone git@github.com:你的用户名/Moreyudeals.git

cd Moreyudeals
```

### 5. 如果已经用HTTPS克隆，修改为SSH

```bash
cd /www/wwwroot/Moreyudeals

# 查看当前remote
git remote -v

# 修改为SSH地址
git remote set-url origin git@github.com:你的用户名/Moreyudeals.git

# 验证
git remote -v
```

---

## 方法二：Personal Access Token (PAT)

### 1. 创建GitHub Personal Access Token

1. 访问: https://github.com/settings/tokens
2. 点击 **"Generate new token"** → **"Generate new token (classic)"**
3. 填写描述: `Moreyudeals Server Deploy`
4. 选择权限:
   - ✅ `repo` (完整仓库访问)
   - ✅ `workflow` (如果用到GitHub Actions)
5. 设置过期时间（建议90天或自定义）
6. 点击 **"Generate token"**
7. **立即复制token**（只显示一次！）

### 2. 使用Token克隆仓库

```bash
cd /www/wwwroot

# 方式1：在URL中包含token（不推荐，会暴露在历史记录）
git clone https://TOKEN@github.com/你的用户名/Moreyudeals.git

# 方式2：使用Git凭证存储（推荐）
git clone https://github.com/你的用户名/Moreyudeals.git
# 输入用户名：你的GitHub用户名
# 输入密码：粘贴刚才的Token

# 保存凭证（避免每次输入）
git config --global credential.helper store
```

### 3. 如果已经克隆，配置Token

```bash
cd /www/wwwroot/Moreyudeals

# 方式1：修改remote URL
git remote set-url origin https://TOKEN@github.com/你的用户名/Moreyudeals.git

# 方式2：使用凭证助手
git config credential.helper store
git pull  # 第一次会要求输入用户名和token
```

---

## 方法三：Deploy Key（只读访问）

如果服务器只需要拉取代码（不需要推送），可以使用Deploy Key：

### 1. 在服务器生成专用密钥

```bash
# 生成专用的deploy key
ssh-keygen -t ed25519 -C "deploy@moreyudeals" -f ~/.ssh/moreyudeals_deploy_key

# 查看公钥
cat ~/.ssh/moreyudeals_deploy_key.pub
```

### 2. 添加Deploy Key到仓库

1. 访问你的仓库: `https://github.com/你的用户名/Moreyudeals/settings/keys`
2. 点击 **"Add deploy key"**
3. 标题: `Production Server Deploy`
4. 粘贴公钥
5. **不要勾选** "Allow write access"（只读访问更安全）
6. 点击 **"Add key"**

### 3. 配置SSH使用该密钥

```bash
# 创建或编辑SSH配置
nano ~/.ssh/config

# 添加以下内容：
Host github.com-moreyudeals
    HostName github.com
    User git
    IdentityFile ~/.ssh/moreyudeals_deploy_key
    IdentitiesOnly yes
```

### 4. 克隆时使用特定Host

```bash
cd /www/wwwroot

# 使用配置的Host名称
git clone git@github.com-moreyudeals:你的用户名/Moreyudeals.git
```

---

## 推荐方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **SSH密钥** | 永久有效、安全、无需密码 | 需要管理密钥 | ✅ **推荐：长期部署** |
| **PAT Token** | 简单、可设置权限范围 | 会过期、需要更新 | 临时访问、CI/CD |
| **Deploy Key** | 只读访问、限定单仓库 | 只能读取、配置稍复杂 | 只需拉取代码的服务器 |

---

## 最佳实践建议

### 对于你的场景，推荐使用 **SSH密钥认证**：

```bash
# 服务器上执行完整流程：

# 1. 生成SSH密钥
ssh-keygen -t ed25519 -C "server@moreyudeals.com"
cat ~/.ssh/id_ed25519.pub  # 复制公钥

# 2. 添加到GitHub（手动在网页操作）
# https://github.com/settings/keys

# 3. 测试连接
ssh -T git@github.com

# 4. 克隆仓库（注意使用SSH地址）
cd /www/wwwroot
git clone git@github.com:YOUR_USERNAME/Moreyudeals.git

# 5. 运行部署
cd Moreyudeals
sudo bash scripts/init-database-server.sh
bash scripts/deploy-server.sh
```

---

## 获取仓库地址

在GitHub仓库页面，点击绿色的 **"Code"** 按钮：

- **SSH地址** (推荐): `git@github.com:用户名/Moreyudeals.git`
- **HTTPS地址**: `https://github.com/用户名/Moreyudeals.git`

---

## 故障排查

### SSH连接失败

```bash
# 详细调试
ssh -vT git@github.com

# 检查SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 检查权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
```

### Token认证失败

```bash
# 清除旧凭证
git config --global --unset credential.helper
rm ~/.git-credentials

# 重新配置
git config --global credential.helper store
git pull  # 重新输入
```

### Permission denied

- 检查SSH密钥是否添加到GitHub
- 确认使用的是SSH地址（`git@github.com:`）而不是HTTPS
- 检查Deploy Key是否有写入权限（如果需要推送）

---

## 安全注意事项

1. **SSH私钥安全**
   - 私钥文件权限必须是 `600`
   - 不要分享私钥
   - 定期轮换密钥

2. **PAT Token安全**
   - 不要提交到代码仓库
   - 设置合理的过期时间
   - 使用最小权限原则

3. **服务器访问**
   - 使用防火墙限制SSH访问
   - 禁用root密码登录
   - 使用SSH密钥认证

---

## 后续更新流程

配置好认证后，日常更新非常简单：

```bash
# SSH到服务器
ssh root@43.157.40.96

# 快速更新
cd /www/wwwroot/Moreyudeals
bash scripts/update-server.sh
```

脚本会自动：
1. `git pull` 拉取最新代码
2. 安装/更新依赖
3. 重新构建
4. 重启服务
