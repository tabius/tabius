module.exports = {
  apps : [
    { 
          name: 'tabius-ru',
          script: '/home/ram/tools/node/bin/node',
          args: './dist/server/main.js',
          cwd: '/home/ram/work/tabius-ru',
          instances: 1,
          autorestart: true,
          watch: false,
          max_memory_restart: '1000M',
      }
  ]
}

