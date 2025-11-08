module.exports = {
  apps: [{
    name: 'moreyudeals-worker',
    script: 'dist/index.js',
    cwd: '/var/www/Moreyudeals/packages/worker',

    // Fork 模式 - Worker 单实例运行
    instances: 1,
    exec_mode: 'fork',

    // 自动重启配置
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // 环境变量配置
    env: {
      NODE_ENV: 'production',
      TRANSLATION_ENABLED: 'true',
      DB_HOST: '43.157.40.96',
      DB_PORT: '5432',
      DB_NAME: 'moreyudeals',
      DB_USER: 'moreyudeals',
      DB_PASSWORD: 'bTXsPFtiLb7tNH87',
      SPARHAMSTER_API_URL: 'https://www.sparhamster.at/wp-json/wp/v2/posts',
      SPARHAMSTER_API_LIMIT: '40',
      SPARHAMSTER_BASE_URL: 'https://www.sparhamster.at',
      SPARHAMSTER_TOKEN: '0ccb1264cd81ad8e20f27dd146dfa37d',
      SPARHAMSTER_USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      FETCH_INTERVAL_MIN: '1800',
      FETCH_INTERVAL_MAX: '2100',
      RANDOM_DELAY_MIN: '0',
      RANDOM_DELAY_MAX: '300'
    },

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
