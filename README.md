# Moreyu Deals 🛍️

墨鱼折扣 (Moreyu Deals) —— 一个自动化抓取 + 翻译 + 发布的优惠信息聚合平台。
本项目为 info.moreyu.com（墨鱼资讯）的子站，专注于德语地区本地优惠资讯。

## 🚀 项目特色

- **自动化抓取** - RSS订阅源实时抓取优惠信息
- **智能翻译** - 多Provider架构，智能路由选择最佳翻译引擎（DeepL/Microsoft/Google）
- **SEO友好** - 摘要页SEO优化，全文页noindex策略
- **合规设计** - 版权保护，2小时响应SLA
- **无头架构** - Strapi CMS + Next.js 前后端分离

## 📁 项目文档

- **[AI_PLAYBOOK.md](./AI_PLAYBOOK.md)** — AI协作开发流程
- **[SCOPE.md](./SCOPE.md)** — 项目范围 & 内容策略
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — 技术架构 & 数据模型
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — 腾讯云部署手册
- **[OPERATIONS.md](./OPERATIONS.md)** — 运维监控 & 告警
- **[SEO.md](./SEO.md)** — SEO优化策略
- **[DISCLAIMER.md](./DISCLAIMER.md)** — 机器翻译免责声明

## 🏗️ 技术栈

### 前端
- **Next.js** - React框架，支持SSR/ISR
- **Vercel** - 前端托管平台

### 后端
- **Strapi** - Headless CMS，自托管于腾讯云
- **PostgreSQL** - 主数据库
- **Node.js** - 抓取翻译脚本
- **PM2** - 进程管理

### 基础设施
- **腾讯云轻量服务器** - 后端托管
- **腾讯云COS** - 媒体文件存储
- **宝塔面板** - 服务器管理
- **Redis** - 翻译缓存和配额管理
- **多Provider翻译架构** - DeepL主力 + Microsoft备用 + Google应急

## 📋 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/PRYePR/moreyudeals.git
cd moreyudeals

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要配置

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看前端应用

### 部署到生产环境

详细部署步骤请参考 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## 🔧 核心功能

### 内容管理
- RSS源管理和状态监控
- 文章抓取、去重、智能翻译
- 多语言支持 (中文/英文)
- **智能翻译路由**: 根据内容重要性自动选择最佳Provider
- **翻译缓存机制**: Redis缓存避免重复API调用，降低成本
- **故障转移**: Provider失效时自动切换备用方案
- 分类管理 (超市｜3C｜家电｜家居｜服饰｜旅游｜金融/银行｜其他)

### SEO优化
- 摘要页允许索引，全文页禁止索引
- 结构化数据 (schema.org/Article)
- 多语言hreflang标签
- 自动sitemap生成

### 合规保护
- **机器翻译免责声明**：页面显著位置提示翻译局限性
- **明确来源标注**：每篇文章标注德语原文来源
- **翻译透明度**：显示使用的翻译引擎和翻译时间
- **版权异议处理**：2小时响应，24小时下线SLA
- **推广链接披露**：透明披露佣金获取

## 📊 项目状态

- 🏗️ **开发阶段**: MVP开发中
- 📅 **预计上线**: 2025年10月
- 🎯 **目标**: 每日50+优惠信息更新

## 🤝 开发协作

本项目采用AI协作开发模式：
- **项目经理**: 需求管理 & 决策
- **Claude**: 主力开发工程师
- **GPT/Gemini**: 架构设计 & 代码审核

详细协作流程见 **[AI_PLAYBOOK.md](./AI_PLAYBOOK.md)**

## 📧 联系方式

- **技术支持**: support@moreyu.com
- **法务事务**: legal@moreyu.com
- **GitHub**: [PRYePR/moreyudeals](https://github.com/PRYePR/moreyudeals)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

*Powered by AI-driven development | 墨鱼团队 © 2025*