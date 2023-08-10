module.exports = {
  apps : [
    { 
          name: 'nest-ru',
          script: '/home/ram/tools/node/bin/ts-node',
          args: '-r tsconfig-paths/register ./server/main.ts ',
          cwd: '/home/ram/work/tabius-ru',
          instances: 1,
          autorestart: true,
          watch: false,
          max_memory_restart: '1000M',
          env: {
              NO_COLOR: "1",
              TABIUS_CONFIG_DIR: '/opt/tabius-ru/',
          }
      }
  ]
}
