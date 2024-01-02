module.exports = {
  apps: [
    {
      name: 'tabius-org',
      script: '/home/ram/tools/node/bin/node',
      args: './dist/server/main.js',
      cwd: '/home/ram/work/tabius-org',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1000M',
      env: {
        'PORT': 13101,
      },
    },
  ],
};

