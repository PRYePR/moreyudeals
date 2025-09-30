/**
 * 翻译系统简单测试
 * 测试基础功能和类型系统
 */

import { CoreTranslationManager } from './translation-manager';
import { DeepLProvider } from './providers/deepl';
import { TranslationError } from './types';

async function testTranslationSystem() {
  console.log('🧪 开始测试翻译系统...\n');

  // 1. 测试没有Provider的情况
  console.log('📝 测试1: 创建翻译管理器 (无Provider)');
  const manager = new CoreTranslationManager({
    primary: 'deepl',
    fallback: ['microsoft', 'google'],
    cacheEnabled: false // 暂时禁用缓存以简化测试
  });

  try {
    await manager.translate({
      text: 'Hallo Welt',
      from: 'de',
      to: 'zh'
    });
    console.log('❌ 应该抛出错误但没有');
  } catch (error) {
    console.log('✅ 正确抛出错误:', (error as Error).message);
  }

  // 2. 测试Provider状态
  console.log('\n📝 测试2: 获取Provider状态');
  const statuses = await manager.getProviderStatus();
  console.log('✅ Provider状态数量:', statuses.length);

  // 3. 测试添加模拟Provider
  console.log('\n📝 测试3: 添加模拟DeepL Provider');

  // 创建一个模拟的DeepL Provider用于测试
  class MockDeepLProvider extends DeepLProvider {
    constructor() {
      super({ apiKey: 'mock-key' });
    }

    async isHealthy(): Promise<boolean> {
      return true;
    }

    async translate(input: any) {
      // 模拟翻译结果
      return {
        translatedText: '你好世界', // 模拟德语 "Hallo Welt" 的中文翻译
        provider: 'deepl' as const,
        confidence: 0.95,
        detectedLanguage: input.from,
        cacheHit: false,
        translatedAt: new Date()
      };
    }

    async getUsage() {
      return {
        requestsToday: 1,
        quotaLimit: 500000,
        quotaRemaining: 499999
      };
    }
  }

  const mockProvider = new MockDeepLProvider();
  manager.addProvider(mockProvider);
  console.log('✅ 已添加模拟Provider');

  // 4. 测试翻译功能
  console.log('\n📝 测试4: 执行模拟翻译');
  try {
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
  } catch (error) {
    console.log('❌ 翻译失败:', (error as Error).message);
  }

  // 5. 测试Provider状态 (有Provider后)
  console.log('\n📝 测试5: 获取Provider状态 (有Provider后)');
  const statusesAfter = await manager.getProviderStatus();
  console.log('✅ Provider状态:');
  statusesAfter.forEach(status => {
    console.log(`  - ${status.name}: ${status.healthy ? '健康' : '不健康'}`);
    console.log(`    今日请求: ${status.usage.requestsToday}`);
  });

  // 6. 测试配置更新
  console.log('\n📝 测试6: 更新配置');
  manager.updateConfig({
    maxRetries: 5,
    cacheTTL: 7200
  });
  console.log('✅ 配置更新成功');

  // 7. 测试移除Provider
  console.log('\n📝 测试7: 移除Provider');
  manager.removeProvider('deepl');
  const statusesAfterRemoval = await manager.getProviderStatus();
  console.log('✅ 移除后Provider数量:', statusesAfterRemoval.length);

  await manager.close();
  console.log('\n🎉 所有测试完成!');
}

// 运行测试
if (require.main === module) {
  testTranslationSystem().catch(console.error);
}