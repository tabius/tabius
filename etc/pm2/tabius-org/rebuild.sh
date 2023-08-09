cd ~/work/tabius-org
git pull --verbose

rm -rf node_modules
npm install

pm2 stop tabius-org nest-org

rm -rf dist
npm run build:ssr-org

pm2 start tabius-org nest-org

