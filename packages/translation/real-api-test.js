/**
 * 真实的DeepL API测试
 * 需要先配置.env文件中的API密钥
 */

require('dotenv').config();
const axios = require('axios');

class RealDeepLProvider {
  constructor(config) {
    this.name = 'deepl';
    this.config = {
      endpoint: 'https://api-free.deepl.com/v2',
      timeout: 10000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  async isHealthy() {
    try {
      const response = await this.client.get('/usage');
      return response.status === 200;
    } catch (error) {
      console.error('健康检查失败:', error.message);
      return false;
    }
  }

  async translate(input) {
    try {
      const params = new URLSearchParams({
        text: input.text,
        source_lang: this.mapLanguageCode(input.from),
        target_lang: this.mapLanguageCode(input.to),
        preserve_formatting: '1'
      });

      const response = await this.client.post('/translate', params);

      if (!response.data.translations || response.data.translations.length === 0) {
        throw new Error('DeepL返回空翻译结果');
      }

      const translation = response.data.translations[0];

      return {
        translatedText: translation.text,
        provider: 'deepl',
        confidence: 0.95,
        detectedLanguage: this.mapDeepLLanguage(translation.detected_source_language),
        cacheHit: false,
        translatedAt: new Date()
      };

    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;

        if (status === 456) {
          throw new Error(`配额超限: ${message}`);
        }
        if (status === 403) {
          throw new Error(`API密钥无效: ${message}`);
        }
        throw new Error(`DeepL API错误 (${status}): ${message}`);
      }
      throw error;
    }
  }

  async getUsage() {
    try {
      const response = await this.client.get('/usage');
      const usage = response.data;

      return {
        requestsToday: 0, // DeepL不提供这个信息
        quotaLimit: usage.character_limit,
        quotaRemaining: usage.character_limit - usage.character_count,
        characterCount: usage.character_count
      };
    } catch (error) {
      console.warn('获取使用统计失败:', error.message);
      return {
        requestsToday: 0,
        quotaLimit: 500000,
        quotaRemaining: undefined
      };
    }
  }

  mapLanguageCode(language) {
    const mapping = {
      'de': 'DE',
      'zh': 'ZH',
      'en': 'EN'
    };
    return mapping[language] || language.toUpperCase();
  }

  mapDeepLLanguage(deeplLang) {
    const mapping = {
      'DE': 'de',
      'ZH': 'zh',
      'EN': 'en'
    };
    return mapping[deeplLang] || 'de';
  }
}

async function runRealApiTest() {
  console.log('🧪 开始真实DeepL API测试...\n');

  // 检查环境变量
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey || apiKey === 'your_deepl_api_key_here') {
    console.error('❌ 请先在.env文件中配置DEEPL_API_KEY');
    console.log('   1. 复制 .env.example 为 .env');
    console.log('   2. 编辑 .env 文件，填入你的DeepL API密钥');
    return;
  }

  try {
    // 1. 创建DeepL Provider
    console.log('📝 测试1: 创建DeepL Provider');
    const provider = new RealDeepLProvider({
      apiKey: apiKey,
      endpoint: process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2'
    });
    console.log('✅ Provider创建成功');

    // 2. 测试健康检查
    console.log('\n📝 测试2: API健康检查');
    const healthy = await provider.isHealthy();
    console.log(`${healthy ? '✅' : '❌'} API健康状态: ${healthy ? '正常' : '异常'}`);

    if (!healthy) {
      console.error('❌ API不可用，请检查网络连接和API密钥');
      return;
    }

    // 3. 测试使用量查询
    console.log('\n📝 测试3: 查询API使用量');
    const usage = await provider.getUsage();
    console.log('✅ 使用量信息:');
    console.log(`  - 配额限制: ${usage.quotaLimit.toLocaleString()} 字符/月`);
    console.log(`  - 已使用: ${usage.characterCount?.toLocaleString() || 'N/A'} 字符`);
    console.log(`  - 剩余: ${usage.quotaRemaining?.toLocaleString() || 'N/A'} 字符`);

    // 4. 测试翻译功能
    console.log('\n📝 测试4: 真实翻译测试');
    const testText = process.env.TEST_TEXT || 'Hallo Welt, wie geht es dir?';
    console.log(`原文 (德语): ${testText}`);

    const result = await provider.translate({
      text: testText,
      from: process.env.TEST_SOURCE_LANG || 'de',
      to: process.env.TEST_TARGET_LANG || 'zh'
    });

    console.log('✅ 翻译成功!');
    console.log(`译文 (中文): ${result.translatedText}`);
    console.log(`Provider: ${result.provider}`);
    console.log(`置信度: ${result.confidence}`);
    console.log(`检测到的源语言: ${result.detectedLanguage}`);
    console.log(`翻译时间: ${result.translatedAt.toLocaleString()}`);

    // 5. 测试英语翻译
    console.log('\n📝 测试5: 德语到英语翻译');
    const englishResult = await provider.translate({
      text: testText,
      from: 'de',
      to: 'en'
    });

    console.log('✅ 英语翻译成功!');
    console.log(`译文 (英语): ${englishResult.translatedText}`);

    console.log('\n🎉 所有真实API测试完成!');
    console.log('✅ DeepL翻译服务集成成功');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);

    if (error.message.includes('403')) {
      console.log('\n💡 解决建议:');
      console.log('  - 检查API密钥是否正确');
      console.log('  - 确认API密钥是否有效');
      console.log('  - 检查账户是否正常');
    } else if (error.message.includes('456')) {
      console.log('\n💡 解决建议:');
      console.log('  - 当前月度配额已用完');
      console.log('  - 等待下月重置或升级账户');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 解决建议:');
      console.log('  - 检查网络连接');
      console.log('  - 确认防火墙设置');
    }
  }
}

// 运行测试
if (require.main === module) {
  runRealApiTest();
}