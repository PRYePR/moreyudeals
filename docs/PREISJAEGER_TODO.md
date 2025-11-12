# Preisjaeger 接入待办事项

## ✅ 已完成的工作

### 文档和分析
- ✅ 完整技术方案文档（PREISJAEGER_INTEGRATION.md）
- ✅ 链接类型分析（PREISJAEGER_LINKS_ANALYSIS.md）
- ✅ 快速参考总结（PREISJAEGER_SUMMARY.md）
- ✅ 抓取策略和频率控制方案
- ✅ 字段映射表
- ✅ 联盟链接清洗方案（复用现有系统）

### 技术决策
- ✅ 确认无需登录
- ✅ 确认抓取频率（30分钟）
- ✅ 确认详情页限制（20个/次）
- ✅ 确认商家映射（使用现有merchant-mapping.ts）
- ✅ 确认分类方案（双层分类）
- ✅ 确认货币（EUR）
- ✅ 确认联盟链接处理（Amazon自动清洗）

### 配置文件
- ✅ 创建分类映射配置（category-mapping.ts）
- ✅ 创建分类规范化工具（category-normalizer.ts）
- ✅ 完善商家映射配置（merchant-mapping.ts）
  - ✅ 修正 amazon-at → amazon-de
  - ✅ 新增 13 个商家（tink, samsung, aliexpress, ebay-de, gymbeam, bergzeit, 43einhalb, afew-store, smyths-toys, flexispot, shark, dm-drogerie）
  - ✅ 总计 31 个商家配置

---

## 🔧 待实施的技术工作

### 高优先级（必须做）

#### 1. ✅ 创建分类映射配置文件
**文件**: `packages/worker/src/config/category-mapping.ts`

**状态**: ✅ 已完成

**已实现**:
- ✅ 15个主分类（基于Preisjaeger完整分类体系）
- ✅ 4个子分类示例（家用电器、咖啡机、厨房烹饪、办公用品）
- ✅ 双语支持（中文 + 德文）
- ✅ 多站点别名映射（preisjaeger + sparhamster）
- ✅ 父子层级关系支持
- ✅ 统计和报告工具

**Preisjaeger完整分类**（从真实数据提取）:
- Elektronik（电子产品）
- Home & Living（家居生活）
- Lebensmittel & Haushalt（食品家居）
- Fashion & Accessories（时尚配饰）
- Beauty & Gesundheit（美容健康）
- Sport & Outdoor（运动户外）
- Gaming（游戏）
- Family & Kids（家庭儿童）
- Reisen（旅行）
- Kultur & Freizeit（文化休闲）
- Auto & Motorrad（汽车摩托）
- Garten & Baumarkt（花园建材）
- Telefon & Internet（电话网络）
- Dienstleistungen & Verträge（服务合同）
- Versicherung & Finanzen（保险金融）

---

#### 2. 图片URL拼接规则 ✅ 已验证
**真实URL格式**（已验证）:
```
https://static.preisjaeger.at/threads/raw/CjG87/354419_1/re/768x768/qt/60/354419_1.jpg
```

**JSON数据**:
```json
{
  "mainImage": {
    "path": "threads/raw/CjG87",
    "name": "354419_1"
  }
}
```

**拼接规则**（推荐使用中等尺寸）:
```typescript
// 方式1: 使用固定尺寸（推荐）
const imageUrl = `https://static.preisjaeger.at/${mainImage.path}/${mainImage.name}/re/768x768/qt/60/${mainImage.name}.jpg`;

// 方式2: 如果JSON中有完整的uid字段
// 检查是否已包含扩展名
const ext = mainImage.uid.includes('.') ? '' : '.jpg';
const imageUrl = `https://static.preisjaeger.at/${mainImage.path}/${mainImage.name}/re/768x768/qt/60/${mainImage.name}${ext}`;

// 方式3: 从HTML中提取（最保险）
// 从 window.__INITIAL_STATE__ 或 <img> 标签中直接提取完整URL
```

**可用的图片尺寸**:
- `/re/768x768/qt/60/` - 中等尺寸（推荐）
- `/re/1024x1024/qt/60/` - 大尺寸
- 还有其他响应式尺寸

---

#### 3. ✅ 开发 Fetcher
**文件**: `packages/worker/src/fetchers/preisjaeger-fetcher.ts`

**状态**: ✅ 已完成

**已实现**:
- ✅ 抓取列表页（/neu）解析 data-vue3
- ✅ 去重检查（DeduplicationService）
- ✅ 限制详情页数量（20个，可配置）
- ✅ 抓取详情页，解析 window.__INITIAL_STATE__
- ✅ 5-15秒随机延迟（可配置）
- ✅ 错误处理
- ✅ 统计和日志

**代码行数**: ~320行

---

#### 4. ✅ 开发 Normalizer
**文件**: `packages/worker/src/normalizers/preisjaeger-normalizer.ts`

**状态**: ✅ 已完成

**已实现**:
- ✅ 解析列表页JSON（normalizeFromList）
- ✅ 解析详情页JSON（normalize）
- ✅ 完整字段映射（参考文档3.2）
  - ✅ 基础字段、价格、商家、分类、链接、图片、时间
- ✅ 调用 normalizeMerchant()
- ✅ 调用 normalizeCategory()
- ✅ 调用 AffiliateLinkService
- ✅ 生成Deal对象
- ✅ 验证逻辑

**代码行数**: ~330行
**特色功能**: 图片URL自动拼接、联盟链接自动替换

---

#### 5. ✅ 集成到主抓取流程
**文件**: `packages/worker/src/index.ts`

**状态**: ✅ 已完成

**已实现**:
- ✅ 添加 PreisjaegerFetcher 到 Worker
- ✅ 配置独立调度器（30分钟 + 随机延迟）
- ✅ 环境变量配置（.env.example）
- ✅ 错误处理和日志
- ✅ 优雅关闭支持
- ✅ 状态监控集成
- ✅ 翻译流程集成

**代码改动**: ~100行
**新增环境变量**: 7个

---

## 🧪 测试完成情况

### Phase 3: 功能测试 ✅ 已完成
**文件**: `packages/worker/src/test-preisjaeger.ts`
**报告**: `docs/PREISJAEGER_PHASE3_TEST_REPORT.md`

**测试范围**:
- ✅ 列表页抓取（30条记录）
- ✅ 详情页抓取（完整JSON）
- ✅ 数据标准化（30+字段）
- ✅ 商家规范化（Smyths Toys → smyths-toys）
- ✅ 分类规范化（Gaming → gaming）
- ✅ 图片URL构建（HTTP 200验证）
- ✅ 数据验证（全部必需字段）

**测试结果**: ✅ 全部测试通过

---

### Phase 3b: 集成测试 ✅ 已完成
**文件**: `packages/worker/src/test-preisjaeger-integration.ts`
**报告**: `docs/PREISJAEGER_PHASE3B_INTEGRATION_TEST_REPORT.md`

**测试范围**:
- ✅ 数据库连接
- ✅ 完整抓取流程（列表页 → 详情页 → 标准化 → 去重 → 入库）
- ✅ 商家规范化（3/3成功: Smyths Toys, Apple, Steam）
- ✅ 分类规范化（9个分类）
- ✅ 去重机制（0重复）
- ✅ 数据入库（3条记录）
- ✅ 数据验证（数据库抽样核对）

**测试结果**:
- ✅ 3条记录成功入库
- ✅ 所有字段映射正确
- ✅ 图片URL全部有效
- ✅ 总耗时: 7.0秒

**测试数据**:
```
记录 1: PowerA Controller (€19.99, 60% off, Smyths Toys)
记录 2: TF Bank Cashback (Apple)
记录 3: Kao the Kangaroo (€1.81, 67% off, Steam)
```

---

### 中优先级（建议做）

#### 6. 添加环境变量验证
**文件**: `packages/worker/src/config/env-validator.ts`

**新增验证**:
```typescript
PREISJAEGER_FETCH_INTERVAL
PREISJAEGER_MAX_DETAIL_PAGES
PREISJAEGER_DETAIL_MIN_DELAY
PREISJAEGER_DETAIL_MAX_DELAY
```

---

#### 7. 编写单元测试
**文件**: `packages/worker/src/__tests__/preisjaeger-*.spec.ts`

**测试内容**:
- Normalizer字段映射
- 图片URL拼接
- 分类映射
- 去重逻辑

---

#### 8. Cookie备用方案（如遇登录问题）
**当前**: 无需登录（已验证）

**备用**: 如未来遇到403，准备Cookie配置

---

### 低优先级（可选）

#### 9. 其他商家联盟链接清洗
**当前**: 只支持Amazon

**未来**: 可扩展eBay、其他商家

---

#### 10. 分页抓取策略
**当前**: 固定抓取20个

**未来**: 可选实现分页继续抓取

---

## 📋 信息收集清单

### 需要您提供的信息

1. **Sparhamster分类列表** ⚠️
   - 当前使用的所有分类
   - 分类的层级关系（如有）
   - 中文/德文对照

2. **图片URL验证** ⚠️
   - 从真实Preisjaeger详情页复制一个图片的实际URL
   - 用于验证拼接规则

3. **数据库表结构确认**（可选）
   - `deals`表的完整字段
   - 确保映射没有遗漏

---

## 🎯 下一步行动建议

### 方案A: 您提供信息，我帮您实现
1. 您提供Sparhamster分类列表
2. 您验证图片URL规则（或提供真实图片URL）
3. 我创建category-mapping.ts
4. 我编写fetcher和normalizer代码
5. 一起测试

### 方案B: 我先创建基础代码框架
1. 我创建fetcher和normalizer的代码框架
2. 图片URL和分类先用占位符
3. 您后续补充分类映射
4. 您测试时验证图片URL

### 方案C: 分步实施
1. **第一步**: 创建分类映射（需要您的信息）
2. **第二步**: 验证图片URL（需要您测试）
3. **第三步**: 我编写fetcher/normalizer
4. **第四步**: 集成测试

---

## 🔍 快速验证图片URL的方法

```bash
# 方法1: 直接访问Preisjaeger详情页，查看图片URL
curl -s "https://www.preisjaeger.at/deals/tesafilm-standard-...-354419" | grep -o 'https://static.preisjaeger.at/[^"]*354419[^"]*\.jpg' | head -1

# 方法2: 查看浏览器开发者工具
# 1. 打开 https://www.preisjaeger.at/deals/...
# 2. F12 → Network → 筛选 Img
# 3. 查看实际加载的图片URL
```

---

**优先级排序**:
1. 🔴 分类映射（需要您的信息）
2. 🔴 图片URL验证（需要您测试）
3. 🟡 Fetcher实现（我可以做）
4. 🟡 Normalizer实现（我可以做）
5. 🟢 测试和集成（一起做）

您想先做哪一个？还是需要我先写一些代码框架？
