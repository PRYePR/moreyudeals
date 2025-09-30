#!/bin/bash

echo "🧪 启动DeepL API翻译测试..."
echo ""

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "❌ .env文件不存在!"
    echo "请先创建.env文件并配置DEEPL_API_KEY"
    exit 1
fi

# 检查API密钥是否配置
if ! grep -q "DEEPL_API_KEY=" .env || grep -q "your_deepl_api_key_here" .env; then
    echo "❌ 请先在.env文件中配置你的DeepL API密钥"
    echo ""
    echo "📝 编辑方法："
    echo "   open -a TextEdit .env"
    echo "   # 然后将DEEPL_API_KEY设置为你的真实API密钥"
    exit 1
fi

echo "✅ 配置检查通过，开始测试..."
echo ""

# 运行真实API测试
node real-api-test.js