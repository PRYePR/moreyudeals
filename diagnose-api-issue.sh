#!/bin/bash

echo "=== Sparhamster API 诊断脚本 ==="
echo ""

# 测试 1: 检查基本连接
echo "📡 测试 1: 基本连接测试"
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}\n" "https://www.sparhamster.at" --max-time 10
echo ""

# 测试 2: 测试 API 端点（简单 User-Agent）
echo "📡 测试 2: API 端点（简单 User-Agent）"
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}\n" \
  "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=1" \
  -H "User-Agent: Mozilla/5.0" \
  --max-time 10
echo ""

# 测试 3: 测试 API 端点（配置的 User-Agent）
echo "📡 测试 3: API 端点（配置的 User-Agent）"
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}\n" \
  "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=1" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  --max-time 10
echo ""

# 测试 4: 测试完整请求（包含 _embed）
echo "📡 测试 4: 完整请求（包含 _embed）"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=40&_embed=true&orderby=date&order=desc" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  --max-time 10)
echo "HTTP 状态码: $HTTP_CODE"

if [ "$HTTP_CODE" = "500" ]; then
  echo "⚠️  检测到 500 错误！尝试获取错误详情..."
  curl -s "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=40&_embed=true&orderby=date&order=desc" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    --max-time 10 | head -c 500
  echo ""
fi
echo ""

# 测试 5: 测试不同的 per_page 参数
echo "📡 测试 5: 测试不同的请求数量"
for count in 1 10 20 40; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=$count&_embed=true" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    --max-time 10)
  echo "per_page=$count: HTTP $HTTP_CODE"
done
echo ""

# 测试 6: 测试不带 _embed 参数
echo "📡 测试 6: 不带 _embed 参数"
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}\n" \
  "https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=40&orderby=date&order=desc" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  --max-time 10
echo ""

echo "=== 诊断完成 ==="
