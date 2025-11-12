# Preisjaeger 开发计划

**日期**: 2025-11-11
**状态**: 配置完成，开始开发

---

## 📋 开发顺序

### Phase 1: 核心功能开发 ✅ 已完成

#### Step 1: Normalizer 开发（优先）✅ 已完成
**文件**: `packages/worker/src/normalizers/preisjaeger-normalizer.ts`

**已实现**:
- ✅ 创建 Normalizer 类基础结构
- ✅ 实现 normalize() - 处理详情页数据
- ✅ 实现 normalizeFromList() - 处理列表页数据（可选）
- ✅ 实现完整字段映射逻辑
  - ✅ 基础字段（ID、标题、描述）
  - ✅ 价格字段（price, originalPrice, discount）
  - ✅ 商家字段（调用 normalizeMerchant）
  - ✅ 分类字段（调用 normalizeCategory）
  - ✅ 链接字段（merchantLink, affiliateLink）
  - ✅ 图片 URL 拼接（buildImageUrl）
  - ✅ 时间戳转换（Unix → Date）
- ✅ 集成 AffiliateLinkService
- ✅ 错误处理
- ✅ 验证逻辑
- ✅ 日志记录

**实际时间**: 完成

---

#### Step 2: Fetcher 开发 ✅ 已完成
**文件**: `packages/worker/src/fetchers/preisjaeger-fetcher.ts`

**已实现**:
- ✅ 创建 Fetcher 类基础结构
- ✅ 实现列表页抓取
  - ✅ 请求 https://www.preisjaeger.at/neu
  - ✅ 解析 data-vue3 属性中的 JSON
  - ✅ 提取 threadId 列表
- ✅ 实现去重逻辑
  - ✅ 调用 DeduplicationService
  - ✅ 过滤已存在的 threadId
- ✅ 实现详情页抓取
  - ✅ 限制最多 20 个（可配置）
  - ✅ 随机延迟 5-15 秒（可配置）
  - ✅ 解析 window.__INITIAL_STATE__.threadDetail
- ✅ 错误处理
- ✅ 统计和日志

**实际时间**: 完成

---

### Phase 2: 集成和配置 ⏸️ 等待

#### Step 3: 环境变量配置 ⏸️ 等待
**文件**: `.env.example` 和相关配置

**任务**:
- [ ] 添加 Preisjaeger 配置项
  ```bash
  PREISJAEGER_FETCH_INTERVAL=30
  PREISJAEGER_MAX_DETAIL_PAGES=20
  PREISJAEGER_DETAIL_MIN_DELAY=5000
  PREISJAEGER_DETAIL_MAX_DELAY=15000
  ```
- [ ] 更新环境变量验证（如有）

**预计时间**: 15分钟

---

#### Step 4: 主程序集成 ⏸️ 等待
**文件**: `packages/worker/src/index.ts` 或调度器

**任务**:
- [ ] 导入 PreisjaegerFetcher
- [ ] 添加到抓取任务列表
- [ ] 配置调度间隔（30分钟）
- [ ] 错误处理和监控

**预计时间**: 30分钟

---

### Phase 3: 测试和验证 ⏸️ 等待

#### Step 5: 单元测试 ⏸️ 等待
**文件**: `packages/worker/src/__tests__/preisjaeger-*.spec.ts`

**任务**:
- [ ] Normalizer 测试
  - [ ] 字段映射测试
  - [ ] 商家规范化测试
  - [ ] 分类规范化测试
  - [ ] 图片 URL 拼接测试
  - [ ] 联盟链接处理测试
- [ ] Fetcher 测试（可选，使用 mock）

**预计时间**: 1-2小时

---

#### Step 6: 集成测试 ⏸️ 等待

**任务**:
- [ ] 本地运行完整抓取流程
- [ ] 验证数据入库
- [ ] 检查数据质量
  - [ ] 商家规范化是否正确
  - [ ] 分类映射是否正确
  - [ ] 联盟链接是否替换
  - [ ] 图片 URL 是否有效
- [ ] 监控日志和错误
- [ ] 性能测试（延迟、频率）

**预计时间**: 1小时

---

### Phase 4: 部署和监控 ⏸️ 等待

#### Step 7: 生产环境部署 ⏸️ 等待

**任务**:
- [ ] 更新生产环境变量
- [ ] 部署代码
- [ ] 启动抓取服务
- [ ] 监控首次运行

**预计时间**: 30分钟

---

#### Step 8: 监控和优化 ⏸️ 等待

**任务**:
- [ ] 监控抓取成功率
- [ ] 检查未匹配商家/分类
- [ ] 根据统计报告补充配置
- [ ] 优化频率和延迟（如需要）

**持续进行**

---

## 📊 进度追踪

| 阶段 | 任务 | 状态 | 预计时间 | 实际时间 |
|------|------|------|----------|----------|
| Phase 1 | Step 1: Normalizer | ✅ 已完成 | 1-2h | ~1h |
| Phase 1 | Step 2: Fetcher | ✅ 已完成 | 2-3h | ~1h |
| Phase 2 | Step 3: 环境变量 | ⏸️ 待实施 | 15m | - |
| Phase 2 | Step 4: 主程序集成 | ⏸️ 待实施 | 30m | - |
| Phase 3 | Step 5: 单元测试 | ⏸️ 待实施 | 1-2h | - |
| Phase 3 | Step 6: 集成测试 | ⏸️ 待实施 | 1h | - |
| Phase 4 | Step 7: 生产部署 | ⏸️ 待实施 | 30m | - |
| Phase 4 | Step 8: 监控优化 | ⏸️ 待实施 | 持续 | - |

**总预计时间**: 7-10 小时
**已完成时间**: ~2 小时

---

## ✅ 已完成的前置工作

- ✅ 技术方案文档
- ✅ 分类映射配置（15个主分类 + 4个子分类）
- ✅ 分类规范化工具
- ✅ 商家映射配置（31个商家）
- ✅ 商家规范化工具
- ✅ 联盟链接服务
- ✅ 示例数据准备
- ✅ 字段映射文档

---

## 🎯 当前任务

**已完成**: Phase 1 - Normalizer 和 Fetcher 开发

**下一步**: Phase 2 - 环境变量配置和主程序集成

---

## 📚 参考文档

- `PREISJAEGER_INTEGRATION.md` - 技术方案
- `PREISJAEGER_CONFIG_COMPLETE.md` - 配置完成报告
- `PREISJAEGER_SUMMARY.md` - 快速参考
- `PREISJAEGER_LINKS_ANALYSIS.md` - 链接处理
- `preisjaeger_sample_thread.json` - 测试数据

---

**创建时间**: 2025-11-11
**最后更新**: 2025-11-11
