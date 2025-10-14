/**
 * RandomScheduler (Integration Test)
 *
 * 测试随机调度器的实际运行行为
 *
 * 注意：这些测试涉及真实的时间等待，运行时间较长（~27秒）
 *
 * 如何运行：
 * RUN_INTEGRATION_TESTS=1 npm test src/__tests__/integration/scheduler.spec.ts
 *
 * 注意：此测试默认被跳过，避免在普通单元测试时等待真实时间
 */

import { RandomScheduler } from '../../scheduler/random-scheduler';

// 检查是否应该运行集成测试
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === '1';

// 根据环境变量决定是否跳过
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('RandomScheduler (Integration)', () => {
  describe('随机间隔执行', () => {
    it('应在随机间隔内执行任务', async () => {
      console.log('🔄 测试随机调度器...');

      const executionTimes: number[] = [];
      let executions = 0;

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 3,
          taskName: 'Integration Test Task',
        },
        async () => {
          const now = Date.now();
          executionTimes.push(now);
          executions++;
          console.log(`   ⏰ 第 ${executions} 次执行 (${new Date(now).toISOString()})`);
        }
      );

      scheduler.start();

      // 等待至少 3 次执行
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (executions >= 3) {
            clearInterval(check);
            scheduler.stop();
            resolve();
          }
        }, 100);
      });

      console.log(`📊 执行统计:`);
      console.log(`   - 总执行次数: ${executions}`);
      console.log(`   - 总耗时: ${(executionTimes[executionTimes.length - 1] - executionTimes[0]) / 1000}s`);

      // 验证间隔在配置范围内
      const intervals: number[] = [];
      for (let i = 1; i < executionTimes.length; i++) {
        const interval = (executionTimes[i] - executionTimes[i - 1]) / 1000;
        intervals.push(interval);
        console.log(`   - 间隔 ${i}: ${interval.toFixed(2)}s`);

        // 允许 0.5 秒的时间误差
        expect(interval).toBeGreaterThanOrEqual(0.8);
        expect(interval).toBeLessThanOrEqual(3.5);
      }

      // 验证间隔不完全相同（随机性）
      const uniqueIntervals = new Set(intervals.map(i => Math.floor(i * 10)));
      if (intervals.length >= 2) {
        expect(uniqueIntervals.size).toBeGreaterThan(1);
        console.log(`✅ 间隔具有随机性 (${uniqueIntervals.size} 种不同间隔)`);
      }

      console.log('✅ 随机调度器运行正常');
    }, 15000);

    it('stop() 应正确停止调度', async () => {
      console.log('🔄 测试 stop() 功能...');

      let executions = 0;

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Stop Test Task',
        },
        async () => {
          executions++;
          console.log(`   ⏰ 执行 #${executions}`);
        }
      );

      scheduler.start();

      // 等待至少 1 次执行
      await new Promise(resolve => setTimeout(resolve, 1500));

      const executionsBeforeStop = executions;
      console.log(`   停止前执行次数: ${executionsBeforeStop}`);

      scheduler.stop();

      // 停止后再等待 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000));

      const executionsAfterStop = executions;
      console.log(`   停止后执行次数: ${executionsAfterStop}`);

      // 停止后不应再有新的执行
      expect(executionsAfterStop).toBe(executionsBeforeStop);

      console.log('✅ stop() 功能正常');
    }, 10000);

    it('应能处理异步任务错误', async () => {
      console.log('🔄 测试异步任务错误处理...');

      let executions = 0;
      let errors = 0;

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Error Test Task',
        },
        async () => {
          executions++;
          if (executions === 2) {
            errors++;
            console.log(`   ❌ 第 ${executions} 次执行抛出错误`);
            throw new Error('Test error');
          }
          console.log(`   ✅ 第 ${executions} 次执行成功`);
        }
      );

      scheduler.start();

      // 等待至少 3 次执行（包括错误的那次）
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (executions >= 3) {
            clearInterval(check);
            scheduler.stop();
            resolve();
          }
        }, 100);
      });

      console.log(`📊 执行统计:`);
      console.log(`   - 总执行次数: ${executions}`);
      console.log(`   - 错误次数: ${errors}`);

      // 即使有错误，调度器应该继续运行
      expect(executions).toBeGreaterThanOrEqual(3);
      expect(errors).toBe(1);

      console.log('✅ 错误处理正常，调度器继续运行');
    }, 10000);
  });

  describe('不同配置下的行为', () => {
    it('较短间隔应导致更频繁的执行', async () => {
      console.log('🔄 测试短间隔调度...');

      let shortExecs = 0;
      const shortScheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Short Interval Task',
        },
        async () => {
          shortExecs++;
        }
      );

      shortScheduler.start();
      await new Promise(resolve => setTimeout(resolve, 5000));
      shortScheduler.stop();

      console.log(`   短间隔 (1-2s) 5秒内执行次数: ${shortExecs}`);

      // 5秒内应该至少执行 2-3 次
      expect(shortExecs).toBeGreaterThanOrEqual(2);

      console.log('✅ 短间隔调度正常');
    }, 10000);

    it('较长间隔应导致较少的执行', async () => {
      console.log('🔄 测试长间隔调度...');

      let longExecs = 0;
      const longScheduler = new RandomScheduler(
        {
          minIntervalSeconds: 3,
          maxIntervalSeconds: 5,
          taskName: 'Long Interval Task',
        },
        async () => {
          longExecs++;
        }
      );

      longScheduler.start();
      await new Promise(resolve => setTimeout(resolve, 5000));
      longScheduler.stop();

      console.log(`   长间隔 (3-5s) 5秒内执行次数: ${longExecs}`);

      // 5秒内应该只执行 1-2 次
      expect(longExecs).toBeLessThanOrEqual(3);

      console.log('✅ 长间隔调度正常');
    }, 10000);
  });
});
