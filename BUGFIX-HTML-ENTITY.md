# Bug 修复: HTML 实体解码问题

**日期**: 2025-10-19
**发现者**: 用户反馈
**严重性**: 中等
**状态**: ✅ 已修复并验证

---

## 问题描述

### 原始问题
`HomepageFetcher.decodeHtmlEntities()` 方法使用 `$('div').html()` 返回 HTML,不会真正解码 HTML 实体。

### 具体表现
当从首页 HTML 提取的链接包含 `&` 时,会被保存为 `&amp;`,导致数据库中存储的链接包含 HTML 实体,而不是纯文本的 `&` 符号。

### 示例
```javascript
// 原始代码
private decodeHtmlEntities(text: string): string {
  const $ = cheerio.load(`<div>${text}</div>`);
  return $('div').html() || text;  // ❌ 返回 HTML,不解码实体
}

// 输入: "https://example.com?a=1&amp;b=2"
// 输出: "https://example.com?a=1&amp;b=2"  (仍然包含 &amp;)
```

---

## 影响范围

### 受影响的数据
- **merchantLink**: 从首页 HTML 提取的 forward 链接
- **所有包含 `&` 的 URL**: 例如查询参数

### 潜在后果
1. **链接失效**: 部分服务器可能不接受 URL 中的 HTML 实体
2. **追踪失败**: 带有 `&amp;` 的参数可能无法正确解析
3. **用户体验**: 重定向可能失败或返回错误

---

## 修复方案

### 代码更改
```diff
  /**
   * 解码 HTML 实体
+  * 使用 .text() 而不是 .html() 来真正解码实体 (如 &amp; -> &)
   */
  private decodeHtmlEntities(text: string): string {
    const $ = cheerio.load(`<div>${text}</div>`);
-   return $('div').html() || text;
+   return $('div').text() || text;
  }
```

### 修复原理
- `.html()`: 返回元素的 HTML 内容,保留 HTML 实体
- `.text()`: 返回元素的文本内容,自动解码 HTML 实体

### 文件位置
`packages/worker/src/services/homepage-fetcher.ts:165`

---

## 验证结果

### 修复前
```sql
SELECT merchant_link FROM deals WHERE merchant_link LIKE '%&amp;%' LIMIT 3;

-- 结果示例:
https://forward.sparhamster.at/out.php?hash=abc&amp;name=xyz&amp;token=123
```

### 修复后
```sql
SELECT
    COUNT(*) as total_links,
    COUNT(CASE WHEN merchant_link LIKE '%&amp;%' THEN 1 END) as with_amp_entity,
    COUNT(CASE WHEN merchant_link LIKE '%&%' AND merchant_link NOT LIKE '%&amp;%' THEN 1 END) as with_correct_ampersand
FROM deals
WHERE merchant_link IS NOT NULL;

-- 结果:
 total_links | with_amp_entity | with_correct_ampersand
-------------+-----------------+------------------------
          29 |               0 |                     29
```

**验证通过**: 所有29条链接都正确解码,0条包含 `&amp;`。

---

## 测试用例

### 测试 1: 基本 URL 参数
```typescript
const input = "https://example.com?a=1&amp;b=2&amp;c=3";
const output = decodeHtmlEntities(input);
// 期望: "https://example.com?a=1&b=2&c=3"
// 实际: ✅ 通过
```

### 测试 2: Forward 链接
```typescript
const input = "https://forward.sparhamster.at/out.php?hash=abc&amp;name=xyz&amp;token=123";
const output = decodeHtmlEntities(input);
// 期望: "https://forward.sparhamster.at/out.php?hash=abc&name=xyz&token=123"
// 实际: ✅ 通过
```

### 测试 3: 其他 HTML 实体
```typescript
const input = "Title &lt;strong&gt;Bold&lt;/strong&gt;";
const output = decodeHtmlEntities(input);
// 期望: "Title <strong>Bold</strong>"
// 实际: ✅ 通过
```

---

## 数据迁移

### 现有数据清理 (可选)
如果数据库中已有包含 `&amp;` 的链接,可以运行以下脚本清理:

```sql
-- 备份
CREATE TABLE deals_backup AS SELECT * FROM deals WHERE merchant_link LIKE '%&amp;%';

-- 清理
UPDATE deals
SET merchant_link = REPLACE(merchant_link, '&amp;', '&')
WHERE merchant_link LIKE '%&amp;%';

-- 验证
SELECT COUNT(*) FROM deals WHERE merchant_link LIKE '%&amp;%';
-- 应该返回 0
```

**注意**: 本次部署前数据库已清空,无需迁移。

---

## 预防措施

### 代码审查要点
1. **HTML 实体处理**: 优先使用 `.text()` 而不是 `.html()`
2. **URL 编码**: 区分 HTML 实体和 URL 编码 (如 `%20`)
3. **单元测试**: 为所有解码函数添加测试用例

### 类似问题检查
已检查以下文件,确认无类似问题:
- ✅ `normalizer/sparhamster-normalizer.ts:253` - 使用 `.text()`
- ✅ `fetchers/sparhamster-fetcher.ts` - 无 HTML 解析
- ✅ `services/deduplication-service.ts` - 无 HTML 解析

---

## 相关文档

- **验证报告**: `T10-VERIFICATION-REPORT.md`
- **部署指南**: `DEPLOYMENT-GUIDE.md`
- **测试日志**: `/tmp/t10-html-entity-fix-test.log`

---

## 总结

### 修复成果
- ✅ 问题根源定位准确
- ✅ 修复方案简单有效
- ✅ 验证结果100%通过
- ✅ 无需数据迁移

### 经验教训
1. **细节很重要**: `.html()` vs `.text()` 的差异容易被忽视
2. **测试覆盖**: 应该为 URL 解码添加单元测试
3. **用户反馈**: 及时发现和修复问题的关键

---

**修复时间**: < 5分钟
**影响范围**: 所有从首页 HTML 提取的链接
**下次部署**: 已包含在当前版本中
