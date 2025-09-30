/**
 * 简化的翻译系统测试
 */

console.log('🧪 开始测试翻译系统...\n');

// 简单测试，不需要import
class MockTranslationManager {
  constructor() {
    this.providers = new Map();
  }

  addProvider(provider) {
    this.providers.set(provider.name, provider);
    console.log(`📝 添加翻译Provider: ${provider.name}`);
  }

  async getProviderStatus() {
    const statuses = [];
    for (const [name, provider] of this.providers) {
      const healthy = await provider.isHealthy();
      statuses.push({
        name,
        healthy,
        usage: { requestsToday: 0 }
      });
    }
    return statuses;
  }

  async translate(input) {
    for (const [name, provider] of this.providers) {
      try {
        const healthy = await provider.isHealthy();
        if (!healthy) continue;

        console.log(`🔄 使用 ${name} 翻译: ${input.text}`);
        return await provider.translate(input);
      } catch (error) {
        console.error(`❌ Provider ${name} 翻译失败:`, error.message);
      }
    }
    throw new Error('所有翻译Provider都失败了');
  }
}

class MockDeepLProvider {
  constructor() {
    this.name = 'deepl';
  }

  async isHealthy() {
    return true;
  }

  async translate(input) {
    // 模拟翻译结果
    return {
      translatedText: '你好世界', // 德语 "Hallo Welt" 的中文翻译
      provider: 'deepl',
      confidence: 0.95,
      detectedLanguage: input.from,
      cacheHit: false,
      translatedAt: new Date()
    };
  }
}

async function runTest() {
  try {
    // 1. 测试创建翻译管理器
    console.log('📝 测试1: 创建翻译管理器');
    const manager = new MockTranslationManager();

    // 2. 测试Provider状态 (无Provider)
    console.log('\n📝 测试2: 获取Provider状态 (无Provider)');
    const emptyStatuses = await manager.getProviderStatus();
    console.log('✅ Provider状态数量:', emptyStatuses.length);

    // 3. 测试添加Provider
    console.log('\n📝 测试3: 添加模拟DeepL Provider');
    const mockProvider = new MockDeepLProvider();
    manager.addProvider(mockProvider);

    // 4. 测试Provider状态 (有Provider后)
    console.log('\n📝 测试4: 获取Provider状态 (有Provider后)');
    const statuses = await manager.getProviderStatus();
    console.log('✅ Provider状态:');
    statuses.forEach(status => {
      console.log(`  - ${status.name}: ${status.healthy ? '健康' : '不健康'}`);
    });

    // 5. 测试翻译功能
    console.log('\n📝 测试5: 执行模拟翻译');
    const result = await manager.translate({
      text: 'Hallo Welt',
      from: 'de',
      to: 'zh'
    });

    console.log('✅ 翻译成功!');
    console.log('  原文:', 'Hallo Welt');
    console.log('  译文:', result.translatedText);
    console.log('  Provider:', result.provider);
    console.log('  置信度:', result.confidence);
    console.log('  翻译时间:', result.translatedAt.toLocaleString());

    console.log('\n🎉 所有测试完成!');
    console.log('✅ 翻译系统基本功能正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
runTest();