module.exports = {
  apps: [{
    name: 'moreyudeals-worker',
    script: 'dist/index.js',
    // cwd 不设置，使用当前目录（执行 pm2 start 的目录）

    // Fork 模式 - Worker 单实例运行
    instances: 1,
    exec_mode: 'fork',

    // 自动重启配置
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // 环境变量 - 从 .env 文件加载（dotenv 默认读取 .env）
    // PM2 会自动加载当前目录的 .env 文件

    // 日志配置
    error_file: '../../logs/worker-error.log',
    out_file: '../../logs/worker-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,

    // 优雅关闭 - Worker 需要更长时间完成当前任务
    kill_timeout: 30000,
    listen_timeout: 3000,

    // 进程 ID 文件
    pid_file: '../../pids/worker.pid',

    // 重启策略
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
