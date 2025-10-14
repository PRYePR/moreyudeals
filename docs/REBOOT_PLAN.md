# 项目重构总体计划 (REBOOT_PLAN)

## 一、目的 (Purpose)

本次重构旨在彻底改造 Moreyudeals 项目,解决现有系统的核心问题:

1. **数据源改造**: 从 RSS 抓取切换到 Sparhamster WordPress REST API,获取更完整的数据(图片、优惠码、商家信息等)
2. **商家识别**: 通过提取商品图片上方的商家 logo,实现准确的商家识别和联盟链接替换
3. **数据标准化**: 建立通用的数据模型,支持多数据源接入
4. **前端重建**: 复刻源站 UI/UX,提供一致的用户体验,同时展示翻译后的内容
5. **防爬虫**: 实现随机间隔抓取,避免被源站封禁

## 二、范围 (Scope)

### 包含在内:
- ✅ Worker 模块完全重构 (packages/worker/)
  - API fetcher 替代 RSS fetcher
  - 随机调度器
  - 内容标准化器
  - 商家识别与 logo 提取
  - 去重机制
- ✅ 数据库架构升级
  - 通用 deals 表设计
  - 商家与联盟链配置表
  - 翻译状态细化
- ✅ 前端重建 (packages/web/)
  - UI 复刻源站布局
  - 移除前端翻译逻辑,改为消费数据库译文
  - 商家 logo 展示
  - 联盟链接集成
- ✅ 翻译库优化 (packages/translation/)
  - 批量翻译接口
  - 统计增强
- ✅ Strapi CMS 扩展
  - 新字段支持
  - 商家白名单配置

### 不包含在内:
- ❌ 多数据源接入 (留待阶段三)
- ❌ 用户系统与评论功能
- ❌ 移动端 App 开发
- ❌ 数据分析与 BI 报表

## 三、角色与职责 (Roles & Responsibilities)

| 角色 | 责任 | 人员 |
|------|------|------|
| **产品经理 & 决策者** | 最终拍板所有设计/验收/部署决策 | 用户 (prye) |
| **技术审核者** | 提供技术建议,审核架构与实现方案 | Codex |
| **执行开发者** | 完成所有编码任务,编写文档,自测 | Claude |

### 工作流程:
1. Claude 先编写对应阶段的设计文档 (.md)
2. 用户 + Codex 共同审阅文档,提出修改意见
3. 文档批准后,Claude 开始编码实现
4. 实现完成后,Claude 提交变更摘要、测试结果、风险评估
5. 用户 + Codex 审核代码,通过后合并

## 四、阶段划分 (Phases)

### 阶段 0: 准备与规划 ✅ (已完成)
**目标**: 完成所有设计文档,搭建协作规范
**交付物**:
- [x] REBOOT_PLAN.md (本文档)
- [x] STEP1_FOUNDATION.md
- [x] STEP2_WORKER_DESIGN.md
- [x] STEP3_DB_SCHEMA.md
- [x] STEP4_WORKER_IMPL.md
- [x] STEP5_WEB_REDESIGN.md
- [x] STEP6_AFFILIATE.md
- [x] STEP7_QA_DEPLOY.md

### 阶段 1: 基础设施重构 ✅ (已完成)
**目标**: Worker API 抓取 + 数据库通用化 + 翻译流程
**里程碑**:
- [x] 数据库 schema 迁移完成 (002_create_deals_table.sql)
- [x] Sparhamster API fetcher 可稳定抓取并存入数据库 (T10 验证通过)
- [x] 翻译 worker 支持批量翻译 (TranslationAdapter 实现)
- [x] 内容去重机制生效 (GUID + content_hash 双重去重)

### 阶段 2: 前端重建 (当前阶段)
**目标**: 前端 UI 复刻源站,消费新数据库
**里程碑**:
- [ ] 首页/列表页布局与源站一致
- [ ] 详情页渲染 content_blocks JSON
- [ ] 商家 logo 正确展示
- [ ] API 接口支持分页/过滤/排序
**文档**: STEP5_WEB_REDESIGN.md (已完成)

### 阶段 3: 商家识别与联盟链 (1-2周)
**目标**: 自动识别商家,替换联盟链接
**里程碑**:
- [ ] Logo 提取与商家映射表建立
- [ ] 联盟链接白名单配置
- [ ] 链接替换逻辑实现
- [ ] Strapi 后台可配置商家规则
**文档**: STEP6_AFFILIATE.md (已完成)

### 阶段 4: 测试与上线 (1周)
**目标**: 全面测试,性能优化,生产部署
**里程碑**:
- [ ] 通过完整测试矩阵
- [ ] 性能达到基线要求
- [ ] 部署脚本与回滚流程验证
- [ ] 生产环境上线
**文档**: STEP7_QA_DEPLOY.md (已完成)

## 五、关键交付物 (Key Deliverables)

| 阶段 | 交付物 | 负责人 | 验收标准 |
|------|--------|--------|----------|
| 0 | 所有 STEP*.md 文档 | Claude | 用户+Codex 审核通过 |
| 1 | Worker 新模块代码 | Claude | 可抓取并入库,无重复 |
| 1 | 数据库迁移脚本 | Claude | 本地测试通过,有回滚 |
| 2 | Web 前端新页面 | Claude | UI 与源站 90% 相似 |
| 2 | API Routes | Claude | 支持分页,响应 <200ms |
| 3 | 商家识别逻辑 | Claude | 准确率 >95% |
| 3 | 联盟链配置表 | Claude | Strapi 可编辑 |
| 4 | 测试报告 | Claude | 覆盖所有核心功能 |
| 4 | 部署文档 | Claude | 其他人可独立部署 |

## 六、环境变量清单 (Environment Variables)

### 现有 (保留):
```bash
# Database (packages/worker/.env, packages/web/.env.local)
DB_HOST=43.157.22.182
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyu_admin
DB_PASSWORD=<secret>
DB_SSL=false

# Redis (packages/worker/.env, packages/translation/.env)
REDIS_URL=redis://localhost:6379

# Translation (packages/worker/.env, packages/translation/.env)
DEEPL_API_KEY=<key>
DEEPL_ENDPOINT=https://api-free.deepl.com/v2
TRANSLATION_TARGET_LANGUAGES=zh,en
TRANSLATION_PROVIDERS=deepl
TRANSLATION_ENABLED=true

# Sparhamster (packages/worker/.env)
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=40
SPARHAMSTER_FEED_ID=6ccd52be-3ae7-422a-9203-484edc390399

# Worker (packages/worker/.env)
FETCH_INTERVAL=30  # 秒

# Web (packages/web/.env.local)
DEALS_DATASET_LIMIT=120
```

### 需要新增/修改:
```bash
# Sparhamster - 随机间隔抓取 (替换现有 FETCH_INTERVAL)
SPARHAMSTER_FETCH_INTERVAL_MIN=300  # 5分钟 (秒)
SPARHAMSTER_FETCH_INTERVAL_MAX=900  # 15分钟 (秒)
SPARHAMSTER_USER_AGENT=Mozilla/5.0 (compatible; MoreYuDeals/1.0)

# Worker - 去重与重试
WORKER_RANDOM_DELAY_ENABLED=true
WORKER_MAX_RETRIES=3
WORKER_DEDUP_WINDOW_HOURS=24

# Affiliate Links (阶段三启用)
AMAZON_AFFILIATE_TAG=<tag>
AFFILIATE_ENABLED=false  # 默认关闭,阶段三开启
```

### 弃用 (将在重构中移除):
```bash
# 这些变量在新架构中不再需要
# FETCH_INTERVAL  # 替换为随机间隔机制
```

## 七、外部依赖 / 凭证 (External Dependencies)

| 服务 | 用途 | 获取方式 | 状态 |
|------|------|----------|------|
| Sparhamster API | 数据源 | 公开 REST API (https://www.sparhamster.at/wp-json/wp/v2) | ✅ 可用 |
| DeepL API (Free) | 翻译服务 | https://www.deepl.com/pro-api | ✅ 已配置 |
| PostgreSQL | 数据库 | 远程服务器 (43.157.22.182) | ✅ 已连接 |
| Redis | 缓存 | 本地 (localhost:6379) | ✅ 运行中 |
| Amazon Associates | 联盟链接 (阶段三) | https://affiliate-program.amazon.com | ⏳ 待申请 |

### 备注:
- **翻译降级策略**: 当前仅使用 DeepL。如需添加备用服务 (Azure/Google),需在阶段一补充配置
- **数据库**: 使用远程 PostgreSQL,需确保备份策略
- **Redis**: 本地缓存,生产环境需迁移到远程实例

## 八、禁止事项 (Prohibitions)

### 开发阶段:
1. ❌ **禁止**未经文档审批先写代码
2. ❌ **禁止**直接修改生产数据库
3. ❌ **禁止**跳过测试直接合并代码
4. ❌ **禁止**硬编码 API Key / 密钥
5. ❌ **禁止**删除现有功能前未备份

### 抓取规范:
1. ❌ **禁止**使用固定间隔抓取 (必须随机)
2. ❌ **禁止**并发请求同一站点 (串行执行)
3. ❌ **禁止**忽略 HTTP 429 错误 (需指数退避)
4. ❌ **禁止**抓取评论/广告内容

### 代码质量:
1. ❌ **禁止**提交未格式化的代码 (运行 lint)
2. ❌ **禁止**使用 `any` 类型 (除非有充分理由)
3. ❌ **禁止**超过 200 行的函数 (需拆分)
4. ❌ **禁止**循环依赖

## 九、风险与缓解策略 (Risks & Mitigation)

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Sparhamster API 变更 | 高 | 中 | 保留 RSS 作为备用;监控 API 响应结构 |
| 被源站封禁 | 高 | 中 | 随机间隔;User-Agent 轮换;记录请求日志 |
| 数据库迁移失败 | 高 | 低 | 先在测试环境验证;提供回滚脚本;完整备份 |
| 翻译配额耗尽 | 中 | 中 | 监控用量;缓存已翻译内容;多服务降级 |
| 商家识别准确率低 | 中 | 中 | 建立人工审核流程;逐步完善映射表 |
| 性能瓶颈 | 中 | 低 | Redis 缓存;数据库索引优化;CDN 加速 |
| 联盟账号被封 | 低 | 低 | 遵守联盟计划规则;不隐藏联盟标识 |

## 十、数据流图 (Data Flow)

```
┌─────────────────┐
│ Sparhamster API │ (WordPress REST API)
└────────┬────────┘
         │ HTTP GET (随机间隔)
         ▼
┌─────────────────────────┐
│   API Fetcher (Worker)  │
│  - 抓取列表/详情        │
│  - 提取 logo URL        │
│  - 过滤广告/评论        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Content Normalizer     │
│  - 标准化字段           │
│  - 识别商家 (logo)      │
│  - 生成 content_blocks  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Deduper & Persistence  │
│  - 检查重复 (hash)      │
│  - 写入 PostgreSQL      │
└────────┬────────────────┘
         │
         ├──────────────────────────┐
         ▼                          ▼
┌─────────────────┐      ┌──────────────────┐
│ Translation Job │      │   Affiliate      │
│  (批量翻译)     │      │   Link Replacer  │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────────────────────┐
│      PostgreSQL (deals 表)       │
│  - 原文 + 译文                   │
│  - 商家信息 + logo               │
│  - 联盟链接                      │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   Next.js API Routes (Web)       │
│  - 分页/过滤/排序                │
│  - Redis 缓存                    │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│      前端组件 (React)            │
│  - 列表页 (复刻源站)             │
│  - 详情页 (content_blocks 渲染)  │
│  - 商家 logo 展示                │
└──────────────────────────────────┘
```

## 十一、批准流程 (Approval Process)

### 文档审批:
1. Claude 完成 STEP*.md 文档
2. Claude 提供自检清单
3. 用户 + Codex 审阅 (48小时内)
4. 提出修改意见或批准
5. 批准后 Claude 可进入实现阶段

### 代码审批:
1. Claude 完成模块实现 + 自测
2. Claude 提交变更摘要 (见下方模板)
3. 用户 + Codex 审阅代码
4. 测试通过后合并到主分支

### 变更摘要模板:
```markdown
## 变更摘要
- 新增/修改/删除: <描述>

## 受影响模块
- packages/worker/src/...
- packages/web/src/...

## 测试情况
- [x] 单元测试通过 (X/Y)
- [x] 集成测试通过
- [x] 手动测试场景

## 潜在风险
- 风险1: <描述> → 缓解措施
- 风险2: <描述> → 缓解措施

## 下一步建议
- 建议1
- 建议2
```

## 十二、自检清单 (Self-Check for Claude)

在提交本文档前,请确认:

- [ ] 所有章节都有实质内容 (不是占位符)
- [ ] 角色分工清晰明确
- [ ] 阶段划分有明确的里程碑与验收标准
- [ ] 禁止事项具体可执行
- [ ] 环境变量清单完整 (包含新增项)
- [ ] 数据流图准确反映新架构
- [ ] 风险识别覆盖关键场景
- [ ] 批准流程可操作

---

**文档版本**: v1.0
**创建日期**: 2025-10-12
**作者**: Claude
**审核状态**: ⏳ 待审核
