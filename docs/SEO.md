# SEO 与收录规范 (SEO)

## robots.txt（放于站点根）
```
User-agent: *
Disallow: /full/
Sitemap: https://deals.moreyu.com/sitemap.xml
```

## sitemap.xml
- 自动生成，包含可收录的**摘要页**与列表分页
- 排除 **/full/** 路径

## 路由与收录
- 列表页：`/zh`, `/en`
- 摘要页：`/zh/deal/[id]`（index）
- 全文页：`/zh/full/[id]`（noindex；仅从摘要页进入）

## Meta 模板
- Title：`{中文标题}｜{分类/品牌}｜Moreyu Deals`
- Description：摘要前 120–160 字
- hreflang：zh / en
- canonical：指向摘要页 URL

## 结构化数据（JSON-LD 示例，注入摘要页）
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "【中文标题】",
  "datePublished": "YYYY-MM-DD",
  "dateModified": "YYYY-MM-DD",
  "author": { "@type": "Organization", "name": "Moreyu Deals" },
  "publisher": { "@type": "Organization", "name": "Moreyu" },
  "mainEntityOfPage": "https://deals.moreyu.com/zh/deal/xxxx",
  "inLanguage": "zh",
  "isBasedOn": "https://www.sparhamster.at/xxxx",
  "translationOfWork": "https://www.sparhamster.at/xxxx",
  "translator": {
    "@type": "SoftwareApplication",
    "name": "机器翻译服务",
    "applicationCategory": "Translation Software"
  },
  "disclaimer": "本文为机器翻译内容，仅供参考。翻译可能存在不准确或误导性信息，请以原文为准。"
}
```

## 机器翻译免责声明显示策略

### **页面顶部免责提示**
- **摘要页**：
  ```html
  <div class="translation-disclaimer bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm text-yellow-700">
          <strong>机器翻译内容</strong> - 本文由{PROVIDER}自动翻译，仅供参考。
          <a href="{ORIGINAL_URL}" class="underline text-yellow-800">查看德语原文</a>
        </p>
      </div>
    </div>
  </div>
  ```

- **全文页**：
  ```html
  <div class="translation-disclaimer bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
    <h3 class="text-lg font-medium text-orange-800">⚠️ 机器翻译全文</h3>
    <p class="mt-2 text-sm text-orange-700">
      此页面内容为机器翻译全文，可能存在语法错误、词汇不准确或语义偏差。
      如需准确信息，请查看 <a href="{ORIGINAL_URL}" class="underline">德语原文</a>。
    </p>
    <p class="mt-1 text-xs text-orange-600">
      翻译引擎：{PROVIDER} | 翻译时间：{TRANSLATED_AT}
    </p>
  </div>
  ```

### **Meta标签中的免责说明**
```html
<meta name="description" content="{摘要内容} - 机器翻译内容，仅供参考">
<meta property="og:description" content="{摘要内容} - 机器翻译内容，仅供参考">
<meta name="robots" content="index,follow,noarchive">
```

## 外链策略
- 所有商家/原文/推广链接：`rel="nofollow external sponsored"`
- 统一按钮文案：**去原文 / 去商家**

## 收录与实验
- 先行策略：摘要页可收录 + 全文页 noindex
- 后续若获得授权或深度改写：可将对应全文页从 noindex 改为 index
