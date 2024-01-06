module.exports = {
  apps: [
    {
      name: 'nest-org',
      script: '/home/ram/tools/node/bin/ts-node',
      args: '-r tsconfig-paths/register ./backend/main.backend.ts ',
      cwd: '/home/ram/work/tabius-org',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1000M',
      env: {
        NO_COLOR: '1',
        TABIUS_CONFIG_DIR: '/opt/tabius-org/',
      }
    }
  ]
};

