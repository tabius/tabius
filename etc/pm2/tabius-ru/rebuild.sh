cd ~/work/tabius-ru
git pull --verbose

rm -rf node_modules
npm install

pm2 stop tabius-ru nest-ru

rm -rf dist
npm run build:ssr-ru

pm2 start tabius-ru nest-ru
