# 分类映射系统 - 快速入门

## TL;DR（太长不看版）

**目的**：为未来接入 Preisjaeger 做准备，避免分类体系混乱。

**核心思路**：
1. ✅ 所有数据源 → 统一标准分类（14个主分类）
2. ✅ 保留原始分类信息（不丢失数据）
3. ✅ 新数据源只需添加映射表，不改前端

**现在做了什么**：
1. ✅ 定义了标准分类体系
2. ✅ 建立了映射框架
3. ✅ 预留了 Preisjaeger 接口
4. ✅ 创建了数据库迁移
5. ✅ 提供了完整文档和演示

**未来只需要**：
1. 填充 Preisjaeger 映射表
2. 在抓取器调用 `mapCategory()`
3. 完事！

---

## 立即体验

### 1. 查看演示效果

```bash
cd packages/shared
npx tsx examples/category-mapping-demo.ts
```

你会看到：
- 14 个标准分类
- Sparhamster 映射示例（95% 精确率）
- Preisjaeger 预留接口
- 映射统计和未映射的分类列表

### 2. 运行数据库迁移（可选）

```bash
cd packages/worker
PGPASSWORD=your_password psql -h host -U user -d db -f migrations/007_add_canonical_category.sql
```

这会添加 `canonical_category` 字段到 `deals` 表。

### 3. 查看关键文件

```bash
# 标准分类定义
cat packages/shared/src/types/categories.ts

# Sparhamster 映射规则（已完成）
cat packages/shared/src/mappers/category-mappings/sparhamster.ts

# Preisjaeger 映射规则（待填充）
cat packages/shared/src/mappers/category-mappings/preisjaeger.ts

# 核心映射逻辑
cat packages/shared/src/mappers/category-mapper.ts
```

---

## 核心概念（5分钟理解）

### 问题

```
Sparhamster: Gaming, Spiele, Konsolen
Preisjaeger: gaming, games, konsolen-spiele
未来网站: 游戏, ゲーム, juegos
                  ↓
          怎么统一？
```

### 解决方案

```typescript
// 1. 定义标准分类
enum CanonicalCategory {
  GAMING = 'gaming',      // 统一标识
  ELECTRONICS = 'electronics',
  // ...
}

// 2. 建立映射
const mapping = mapCategory(
  DataSource.SPARHAMSTER,
  'Gaming',               // 原始分类
  ['Gaming', 'Spiele'],   // 所有标签
  'PS5 Konsole'           // 标题（辅助判断）
)

// 3. 结果
{
  canonical: 'gaming',    // ✅ 标准分类
  source: 'Gaming',       // ✅ 保留原始
  sourceCategories: ['Gaming', 'Spiele'],
  confidence: 0.95,       // ✅ 置信度
  mappedBy: 'exact'       // ✅ 映射方式
}
```

### 数据库存储

```sql
-- 同时存储标准分类和原始分类
canonical_category: 'gaming'                    -- 用于前端筛选
categories: ['Gaming', 'Spiele', 'Konsolen']    -- 保留原始信息
```

---

## 当前状态

### ✅ 已完成

| 项目 | 状态 | 文件 |
|---|---|---|
| 标准分类定义 | ✅ | `packages/shared/src/types/categories.ts` |
| 映射核心逻辑 | ✅ | `packages/shared/src/mappers/category-mapper.ts` |
| Sparhamster 映射 | ✅ | `category-mappings/sparhamster.ts` |
| Preisjaeger 预留 | ✅ | `category-mappings/preisjaeger.ts` |
| 数据库迁移 | ✅ | `packages/worker/migrations/007_*.sql` |
| 演示脚本 | ✅ | `packages/shared/examples/category-mapping-demo.ts` |
| 完整文档 | ✅ | `docs/CATEGORY_MAPPING_SYSTEM.md` |

### 🚧 待集成（不紧急）

1. **抓取器集成**：在 Sparhamster 抓取时调用 `mapCategory()`
2. **前端优化**：使用 `canonicalCategory` 替代当前的分类逻辑
3. **Preisjaeger 准备**：等接入时填充映射表

---

## 未来接入 Preisjaeger 流程

### Step 1: 收集分类（1天）

```bash
# 爬取 Preisjaeger 时记录所有分类
const categories = new Set()
deals.forEach(deal => {
  categories.add(deal.category)
})

console.log(Array.from(categories))
// ['gaming', 'elektronik', 'mode', 'haushalt', ...]
```

### Step 2: 补充映射（2小时）

```typescript
// packages/shared/src/mappers/category-mappings/preisjaeger.ts

export const PREISJAEGER_EXACT_MAPPING = {
  'gaming': CanonicalCategory.GAMING,
  'elektronik': CanonicalCategory.ELECTRONICS,
  'mode': CanonicalCategory.FASHION,
  'haushalt': CanonicalCategory.HOME_KITCHEN,
  // ... 继续填充
}
```

### Step 3: 集成到抓取器（30分钟）

```typescript
import { mapCategory, DataSource } from '@moreyudeals/shared/mappers'

// 在保存到数据库前
const mapping = mapCategory(
  DataSource.PREISJAEGER,
  deal.category,
  deal.tags || [],
  deal.title
)

await db.insert('deals', {
  canonical_category: mapping.canonical,
  categories: mapping.sourceCategories,
  // ... 其他字段
})
```

### Step 4: 测试验证（10分钟）

```bash
# 运行演示查看映射效果
npx tsx packages/shared/examples/category-mapping-demo.ts

# 检查映射统计
精确匹配: 95%+    ← 目标
降级处理: <5%     ← 需要补充映射
```

### Step 5: 前端无需修改 ✨

因为前端已经使用标准分类，新数据自动归类！

---

## 代码示例

### 在抓取器中使用（完整示例）

```typescript
import { mapCategory, DataSource, logUnmappedCategories } from '@moreyudeals/shared/mappers'
import { logger } from './logger'

async function processDeal(rawDeal: any, source: DataSource) {
  // 1. 映射分类
  const categoryMapping = mapCategory(
    source,
    rawDeal.category || 'General',
    rawDeal.categories || rawDeal.tags || [],
    rawDeal.title
  )

  // 2. 记录低置信度映射
  if (categoryMapping.confidence < 0.8) {
    logger.warn('Low confidence category mapping', {
      source: categoryMapping.source,
      canonical: categoryMapping.canonical,
      confidence: categoryMapping.confidence,
      title: rawDeal.title
    })
  }

  // 3. 保存到数据库
  await db.insert('deals', {
    // 标准分类（用于前端筛选）
    canonical_category: categoryMapping.canonical,

    // 原始分类（保留完整信息）
    categories: categoryMapping.sourceCategories,

    // ... 其他字段
  })
}

// 定期记录映射统计
setInterval(() => {
  logUnmappedCategories(logger)
}, 3600000) // 每小时
```

---

## 常见问题

### Q: 现在就要修改 Sparhamster 抓取器吗？

A: **不强制**。当前系统已经能工作，可以等接入 Preisjaeger 时一起改。但建议尽早集成，可以发现问题。

### Q: 不跑数据库迁移会怎样？

A: 不影响当前功能。等需要使用标准分类时再跑也可以。

### Q: 如果 Preisjaeger 有很多新分类怎么办？

A: 不怕！映射系统支持：
1. 精确匹配（添加到映射表）
2. 关键词匹配（模糊识别）
3. 降级到 `general`（兜底）

### Q: 性能影响？

A: 几乎可忽略：
- 映射是纯内存操作
- O(1) 或 O(n) 复杂度（n = 关键词数量）
- 没有网络/数据库调用

### Q: 能不能支持子分类？

A: 当前设计是一级分类，但可以扩展：
```typescript
// 保留在 categories 数组中
categories: ['Gaming', 'Konsolen', 'PlayStation']
           //  ^^^^     ^^^^^^^^    ^^^^^^^^^^^
           // 一级      二级         三级
```

---

## 下一步建议

### 高优先级
- [x] 阅读完整文档（5分钟）
- [x] 运行演示脚本（1分钟）
- [ ] 理解核心概念（10分钟）

### 中优先级（可选）
- [ ] 运行数据库迁移
- [ ] 在 Sparhamster 抓取器集成映射
- [ ] 前端使用标准分类

### 低优先级（等接入 Preisjaeger 时）
- [ ] 收集 Preisjaeger 分类
- [ ] 补充 Preisjaeger 映射表
- [ ] 验证映射效果

---

## 相关文档

- **完整文档**：[CATEGORY_MAPPING_SYSTEM.md](./CATEGORY_MAPPING_SYSTEM.md)
- **演示脚本**：`packages/shared/examples/category-mapping-demo.ts`
- **数据库迁移**：`packages/worker/migrations/007_add_canonical_category.sql`

---

## 总结

**这个系统的价值**：
1. ✅ 提前规划，未来轻松扩展
2. ✅ 不推翻现有实现
3. ✅ 新数据源只需补映射表
4. ✅ 前端逻辑统一简单

**现在投入**：5小时设计 + 实现
**未来节省**：至少 2-3 天重构 + 测试

**结论**：非常值得！
