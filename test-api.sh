#!/bin/bash

echo "=== 测试 Sparhamster API (移除 _embed 后) ==="
echo ""

# 测试不同的 per_page 值（都不带 _embed）
for count in 1 5 10 15 20; do
  echo "测试 per_page=$count (无 _embed):"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=$count&orderby=date&order=desc" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    -H "Accept: application/json, text/plain, */*" \
    -H "Accept-Language: de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7" \
    -H "Referer: https://www.sparhamster.at/" \
    --max-time 15)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ HTTP $HTTP_CODE"
  else
    echo "  ❌ HTTP $HTTP_CODE"
  fi

  # 延迟 2 秒避免请求过快
  sleep 2
done

echo ""
echo "=== 测试完成 ==="
