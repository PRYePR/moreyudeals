# 分类映射系统文档

## 概述

分类映射系统是一个用于将多个数据源的分类归一化到统一标准分类体系的解决方案。

### 为什么需要分类映射？

**问题**：不同数据源（Sparhamster、Preisjaeger 等）有各自的分类体系，分类名称和结构不统一。

**解决方案**：建立一套标准分类体系，将所有数据源的分类映射到标准分类，同时保留原始分类信息。

## 架构设计

### 核心概念

1. **Canonical Category（标准分类）**：统一的分类标准，所有数据源映射到此
2. **Source Categories（原始分类）**：保留来源网站的原始分类数组
3. **Category Mapping（分类映射）**：将原始分类转换为标准分类的过程

### 数据流

```
原始数据（Sparhamster/Preisjaeger）
    ↓
类映射器 (mapCategory)
    ↓
映射结果 (CategoryMapping)
    ↓
数据库 (canonical_category + categories)
    ↓
前端展示（基于标准分类）
```

## 标准分类体系

定义在 `packages/shared/src/types/categories.ts`

### 一级分类（14个）

| ID | 英文名 | 中文名 | 说明 |
|---|---|---|---|
| `gaming` | Gaming | 游戏娱乐 | 游戏、主机、配件等 |
| `electronics` | Electronics | 电子产品 | 电脑、手机、相机、音响等 |
| `fashion` | Fashion | 时尚服饰 | 服装、鞋子、配饰等 |
| `home-kitchen` | Home & Kitchen | 家居厨房 | 家具、厨具、家居装饰等 |
| `sports-outdoor` | Sports & Outdoor | 运动户外 | 运动装备、户外用品等 |
| `beauty-health` | Beauty & Health | 美妆护肤 | 化妆品、护肤品、健康产品等 |
| `automotive` | Automotive | 汽车用品 | 汽车配件、用品等 |
| `food-drinks` | Food & Drinks | 食品饮料 | 食品、饮料、酒类等 |
| `toys-kids` | Toys & Kids | 玩具儿童 | 玩具、儿童用品等 |
| `books-media` | Books & Media | 图书影音 | 书籍、音乐、电影等 |
| `pets` | Pets | 宠物用品 | 宠物食品、用品等 |
| `office` | Office | 办公用品 | 办公用品、文具等 |
| `garden` | Garden | 园艺花园 | 园艺工具、花园用品等 |
| `general` | General | 综合 | 其他未分类商品 |

## 文件结构

```
packages/shared/
├── src/
│   ├── types/
│   │   └── categories.ts          # 标准分类定义
│   ├── mappers/
│   │   ├── category-mapper.ts     # 核心映射逻辑
│   │   ├── category-mappings/
│   │   │   ├── sparhamster.ts     # Sparhamster 映射规则
│   │   │   └── preisjaeger.ts     # Preisjaeger 映射规则（待完善）
│   │   └── index.ts
│   └── examples/
│       └── category-mapping-demo.ts  # 演示脚本
```

## 映射规则

### 映射优先级

1. **特殊规则**（如果定义）：自定义逻辑
2. **精确匹配**：原始分类精确对应标准分类（置信度 0.95）
3. **关键词匹配**：标题或分类包含特定关键词（置信度 0.6-0.7）
4. **模糊匹配**：使用标准分类的关键词库匹配（置信度 0.6）
5. **降级处理**：无法匹配时归类为 `general`（置信度 0.1）

### Sparhamster 映射规则

文件：`packages/shared/src/mappers/category-mappings/sparhamster.ts`

**精确映射示例**：
```typescript
{
  'gaming': CanonicalCategory.GAMING,
  'spiele': CanonicalCategory.GAMING,
  'electronics': CanonicalCategory.ELECTRONICS,
  'elektronik': CanonicalCategory.ELECTRONICS,
  // ... 更多映射
}
```

**关键词映射示例**：
```typescript
{
  keywords: ['spiel', 'game', 'konsole', 'controller'],
  category: CanonicalCategory.GAMING
}
```

### Preisjaeger 映射规则

文件：`packages/shared/src/mappers/category-mappings/preisjaeger.ts`

**状态**：🚧 TODO - 待接入 Preisjaeger 时填充

已预留接口，包括：
- `PREISJAEGER_EXACT_MAPPING`：精确映射表
- `PREISJAEGER_KEYWORD_PATTERNS`：关键词模式
- `preisjaegerSpecialRules()`：特殊规则函数

## 数据库设计

### Schema 变更

迁移文件：`packages/worker/migrations/007_add_canonical_category.sql`

```sql
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS canonical_category VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_deals_canonical_category
ON deals(canonical_category)
WHERE canonical_category IS NOT NULL;
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `canonical_category` | VARCHAR(50) | 标准分类（映射后） |
| `categories` | JSONB | 原始分类数组（来源网站的标签） |

## 使用方法

### 1. 在抓取器中使用

```typescript
import { mapCategory, DataSource } from '@moreyudeals/shared/mappers'

// 抓取到的原始数据
const rawDeal = {
  category: 'Gaming',
  categories: ['Gaming', 'Konsolen', 'PlayStation'],
  title: 'PS5 Konsole mit 2 Controllern'
}

// 映射到标准分类
const mapping = mapCategory(
  DataSource.SPARHAMSTER,
  rawDeal.category,
  rawDeal.categories,
  rawDeal.title
)

// 保存到数据库
await db.insert('deals', {
  canonical_category: mapping.canonical,  // 'gaming'
  categories: mapping.sourceCategories,   // ['Gaming', 'Konsolen', 'PlayStation']
  // ... 其他字段
})
```

### 2. 在前端使用

```typescript
// 基于标准分类筛选
const filteredDeals = deals.filter(
  deal => deal.canonicalCategory === 'gaming'
)

// 显示中文分类名
import { CANONICAL_CATEGORIES } from '@moreyudeals/shared/mappers'

const categoryName = CANONICAL_CATEGORIES[deal.canonicalCategory].translatedName
// '游戏娱乐'
```

### 3. 批量映射

```typescript
import { mapCategories } from '@moreyudeals/shared/mappers'

const mappings = mapCategories(DataSource.SPARHAMSTER, [
  { category: 'Gaming', categories: ['Gaming'], title: 'PS5' },
  { category: 'Electronics', categories: ['TV'], title: 'Samsung TV' },
])
```

## 监控与维护

### 获取映射统计

```typescript
import { getMappingStats, logUnmappedCategories } from '@moreyudeals/shared/mappers'

const stats = getMappingStats()
console.log(`精确匹配率: ${stats.exact / stats.total * 100}%`)
console.log(`降级处理: ${stats.fallback} 个`)

// 记录未映射的分类
logUnmappedCategories(logger)
```

### 补充映射规则

当发现未映射的分类时：

1. 查看日志中的 `unmappedCategories`
2. 编辑对应的映射文件：
   - Sparhamster: `category-mappings/sparhamster.ts`
   - Preisjaeger: `category-mappings/preisjaeger.ts`
3. 添加精确映射或关键词模式
4. 重新运行演示脚本验证

## 运行演示

```bash
cd packages/shared
npx tsx examples/category-mapping-demo.ts
```

演示脚本会：
1. 展示所有标准分类
2. 演示 Sparhamster 映射
3. 演示 Preisjaeger 映射
4. 显示映射统计
5. 列出未映射的分类

## 接入新数据源步骤

### 以 Preisjaeger 为例

1. **补充映射规则**
   ```typescript
   // packages/shared/src/mappers/category-mappings/preisjaeger.ts
   export const PREISJAEGER_EXACT_MAPPING = {
     'deals': CanonicalCategory.GENERAL,
     'gutscheine': CanonicalCategory.GENERAL,
     'gaming': CanonicalCategory.GAMING,
     // 添加更多映射...
   }
   ```

2. **集成到抓取器**
   ```typescript
   import { mapCategory, DataSource } from '@moreyudeals/shared/mappers'

   const mapping = mapCategory(
     DataSource.PREISJAEGER,
     deal.category,
     deal.tags, // Preisjaeger 的标签数组
     deal.title
   )
   ```

3. **测试映射效果**
   ```bash
   npx tsx packages/shared/examples/category-mapping-demo.ts
   ```

4. **监控日志**
   - 检查 `unmappedCategories`
   - 补充缺失的映射规则
   - 优化关键词匹配

5. **前端无需修改**
   - 前端已经使用 `canonicalCategory`
   - 新数据自动归类到标准分类

## 优势

### ✅ 扩展性
- 新增数据源只需添加映射文件
- 不影响现有代码

### ✅ 可维护性
- 集中管理分类映射
- 清晰的文件结构

### ✅ 灵活性
- 支持精确匹配、关键词匹配、特殊规则
- 保留原始分类信息

### ✅ 监控能力
- 统计映射质量
- 发现未映射的分类

### ✅ 前端友好
- 统一的分类体系
- 中英文名称支持

## FAQ

### Q: 为什么不直接使用原始分类？
A: 不同数据源的分类体系差异大，直接使用会导致分类混乱。标准化后前端逻辑更简单。

### Q: 原始分类信息会丢失吗？
A: 不会。`categories` 字段保留所有原始分类，`canonical_category` 只是额外的标准化字段。

### Q: 如何处理多语言分类？
A: 标准分类提供了英文和中文名称，可根据需要扩展更多语言。

### Q: 映射置信度有什么用？
A: 可用于质量监控，低置信度的映射可能需要人工复核。

### Q: 如果 Preisjaeger 的分类和 Sparhamster 完全不同怎么办？
A: 没关系！每个数据源有独立的映射文件，最终都映射到同一套标准分类。

## 下一步

- [ ] 在 Sparhamster 抓取器中集成映射逻辑
- [ ] 运行数据库迁移添加 `canonical_category` 字段
- [ ] 补充 Preisjaeger 映射规则（接入时）
- [ ] 在前端使用标准分类进行筛选
- [ ] 建立监控告警机制
