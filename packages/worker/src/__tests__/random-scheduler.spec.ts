/**
 * Random Scheduler 单元测试
 */

import { RandomScheduler } from '../scheduler/random-scheduler';

// 辅助函数: 等待指定时间
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('RandomScheduler', () => {
  let mockTask: jest.Mock<Promise<void>>;

  beforeEach(() => {
    mockTask = jest.fn().mockResolvedValue(undefined);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('构造函数和配置验证', () => {
    it('应成功创建有效配置的调度器', () => {
      expect(() => {
        new RandomScheduler(
          {
            minIntervalSeconds: 5,
            maxIntervalSeconds: 10,
            taskName: 'Test Task',
          },
          mockTask
        );
      }).not.toThrow();
    });

    it('minIntervalSeconds <= 0 应抛出错误', () => {
      expect(() => {
        new RandomScheduler(
          {
            minIntervalSeconds: 0,
            maxIntervalSeconds: 10,
            taskName: 'Test Task',
          },
          mockTask
        );
      }).toThrow('minIntervalSeconds 必须大于 0');
    });

    it('maxIntervalSeconds < minIntervalSeconds 应抛出错误', () => {
      expect(() => {
        new RandomScheduler(
          {
            minIntervalSeconds: 10,
            maxIntervalSeconds: 5,
            taskName: 'Test Task',
          },
          mockTask
        );
      }).toThrow('maxIntervalSeconds 必须大于或等于 minIntervalSeconds');
    });

    it('minIntervalSeconds == maxIntervalSeconds 应该允许', () => {
      expect(() => {
        new RandomScheduler(
          {
            minIntervalSeconds: 10,
            maxIntervalSeconds: 10,
            taskName: 'Test Task',
          },
          mockTask
        );
      }).not.toThrow();
    });
  });

  describe('start() 和 stop()', () => {
    it('start() 应设置 isRunning 为 true', () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      expect(scheduler.getIsRunning()).toBe(true);
    });

    it('stop() 应设置 isRunning 为 false', () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      scheduler.stop();
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it('重复调用 start() 应输出警告', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      scheduler.start();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('已经在运行')
      );

      consoleWarnSpy.mockRestore();
    });

    it('stop() 应清除定时器', () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      const timeoutCount = jest.getTimerCount();
      expect(timeoutCount).toBeGreaterThan(0);

      scheduler.stop();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('任务调度', () => {
    it('start() 后应调度第一次任务', () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      expect(jest.getTimerCount()).toBe(1);
    });

    it('任务执行后应自动调度下一次', async () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();

      // 第一次调度
      expect(jest.getTimerCount()).toBe(1);

      // 触发第一次执行
      await jest.runOnlyPendingTimersAsync();

      // 任务应该被调用
      expect(mockTask).toHaveBeenCalledTimes(1);

      // 应该调度了下一次
      expect(jest.getTimerCount()).toBe(1);
    });

    it('stop() 后不应再调度新任务', async () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      scheduler.stop();

      // 不应有定时器
      expect(jest.getTimerCount()).toBe(0);
    });

    it('任务失败不应影响下次调度', async () => {
      const failingTask = jest.fn().mockRejectedValue(new Error('Task failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Failing Task',
        },
        failingTask
      );

      scheduler.start();

      // 触发第一次执行
      await jest.runOnlyPendingTimersAsync();

      // 任务应该被调用并失败
      expect(failingTask).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      // 应该还是调度了下一次
      expect(jest.getTimerCount()).toBe(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('随机间隔', () => {
    it('生成的间隔应在配置范围内', async () => {
      const minInterval = 5;
      const maxInterval = 10;
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: minInterval,
          maxIntervalSeconds: maxInterval,
          taskName: 'Test Task',
        },
        mockTask
      );

      // 使用真实定时器测试随机性
      jest.useRealTimers();

      // 多次测试确保随机值在范围内
      const intervals: number[] = [];
      for (let i = 0; i < 20; i++) {
        const testScheduler = new RandomScheduler(
          {
            minIntervalSeconds: minInterval,
            maxIntervalSeconds: maxInterval,
            taskName: `Test Task ${i}`,
          },
          async () => {}
        );

        // 通过反射获取私有方法来测试 (TypeScript 编译后可以访问)
        const getRandomInterval = (testScheduler as any).getRandomInterval.bind(testScheduler);
        const interval = getRandomInterval();
        intervals.push(interval);

        expect(interval).toBeGreaterThanOrEqual(minInterval);
        expect(interval).toBeLessThanOrEqual(maxInterval);
      }

      // 验证有一定随机性 (不是所有值都相同)
      const uniqueValues = new Set(intervals);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    it('minInterval == maxInterval 时应返回固定值', () => {
      const fixedInterval = 10;
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: fixedInterval,
          maxIntervalSeconds: fixedInterval,
          taskName: 'Fixed Task',
        },
        mockTask
      );

      jest.useRealTimers();

      const getRandomInterval = (scheduler as any).getRandomInterval.bind(scheduler);
      const interval1 = getRandomInterval();
      const interval2 = getRandomInterval();

      expect(interval1).toBe(fixedInterval);
      expect(interval2).toBe(fixedInterval);
    });
  });

  describe('边界情况', () => {
    it('极小间隔 (1秒) 应正常工作', async () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 1,
          taskName: 'Fast Task',
        },
        mockTask
      );

      scheduler.start();
      await jest.runOnlyPendingTimersAsync();

      expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('极大间隔 (1小时) 应正常工作', () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 3600,
          maxIntervalSeconds: 3600,
          taskName: 'Slow Task',
        },
        mockTask
      );

      expect(() => scheduler.start()).not.toThrow();
      scheduler.stop();
    });

    it('任务执行时间长不影响下次调度', async () => {
      const slowTask = jest.fn(async () => {
        await sleep(100); // 模拟耗时任务
      });

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 2,
          taskName: 'Slow Task',
        },
        slowTask
      );

      scheduler.start();
      await jest.runOnlyPendingTimersAsync();

      expect(slowTask).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1); // 应该已经调度下一次
    });
  });

  describe('日志输出', () => {
    it('start() 应输出启动日志', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('启动随机调度器')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('间隔范围')
      );

      consoleLogSpy.mockRestore();
    });

    it('stop() 应输出停止日志', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 5,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      scheduler.stop();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('停止调度器')
      );

      consoleLogSpy.mockRestore();
    });

    it('任务执行应输出开始和完成日志', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 1,
          taskName: 'Test Task',
        },
        mockTask
      );

      scheduler.start();
      await jest.runOnlyPendingTimersAsync();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('开始执行任务')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('任务完成')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('性能测试', () => {
    it('创建多个调度器实例不应有性能问题', () => {
      const schedulers: RandomScheduler[] = [];

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        schedulers.push(
          new RandomScheduler(
            {
              minIntervalSeconds: 1,
              maxIntervalSeconds: 10,
              taskName: `Task ${i}`,
            },
            mockTask
          )
        );
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // 应在 100ms 内完成

      // 清理
      schedulers.forEach(s => s.stop());
    });

    it('快速启动停止不应有问题', () => {
      const scheduler = new RandomScheduler(
        {
          minIntervalSeconds: 1,
          maxIntervalSeconds: 10,
          taskName: 'Test Task',
        },
        mockTask
      );

      expect(() => {
        for (let i = 0; i < 10; i++) {
          scheduler.start();
          scheduler.stop();
        }
      }).not.toThrow();
    });
  });
});
