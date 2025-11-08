module.exports = {
  apps: [{
    name: 'moreyudeals-api',
    script: 'dist/index.js',
    cwd: '/var/www/Moreyudeals/packages/api',

    // Cluster 模式 - 支持零停机部署
    instances: 2,
    exec_mode: 'cluster',

    // 自动重启配置
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',

    // 环境变量 - 从 .env.production 文件加载
    env_file: '.env.production',

    // 日志配置
    error_file: '../../logs/api-error.log',
    out_file: '../../logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true,

    // 优雅关闭 - 给 5 秒时间完成正在处理的请求
    kill_timeout: 5000,
    listen_timeout: 3000,

    // 进程 ID 文件
    pid_file: '../../pids/api.pid',

    // 实例 ID
    instance_var: 'INSTANCE_ID',

    // 日志轮转(可选,需要 pm2-logrotate 模块)
    // 安装: pm2 install pm2-logrotate
    max_restarts: 10,
    min_uptime: '10s',

    // 忽略的监听文件(watch=false 时无效)
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ],

    // 环境变量(如果不用 .env.production 文件,可以在这里配置)
    // env: {
    //   NODE_ENV: 'production',
    //   PORT: 3001,
    //   DB_HOST: '43.157.40.96',
    //   DB_PORT: '5432',
    //   DB_NAME: 'moreyudeals',
    //   DB_USER: 'moreyudeals',
    //   DB_PASSWORD: 'bTXsPFtiLb7tNH87',
    //   API_KEY: 'hYebhdhNYPuKRtu1HWEJ7Q74BaHWtWwEII7KyEg72Zw=',
    //   ALLOWED_ORIGINS: 'https://deals.moreyu.com'
    // }
  }]
};
