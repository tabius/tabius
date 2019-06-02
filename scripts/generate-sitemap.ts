import {promisify} from 'util';
import {readDbConfig} from '@server/db/db-config';

const mysql = require('mysql2/promise');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const exec = promisify(require('child_process').exec);

async function generateSitemap() {
  const connection = await mysql.createConnection(readDbConfig());
  let sitemap = '';
  try {
    const [artistRows] = await connection.execute('SELECT id, mount FROM artist');
    const artistMountById = new Map<number, string>();
    for (const row of artistRows) {
      artistMountById.set(+row.id, row.mount);
      sitemap += `https://tabius.ru/artist/${row.mount}\n`;
    }
    const [songRows] = await connection.execute('SELECT artist_id, mount FROM song');
    for (const row of songRows) {
      const artistMount = artistMountById.get(+row.artist_id);
      if (!artistMount) {
        throw new Error(`Artist not found for song: ${JSON.stringify(row)}`);
      }
      sitemap += `https://tabius.ru/song/${artistMount}/${row.mount}\n`;
    }
  } finally {
    connection.close();
  }
  const sitemapFileName = '/opt/tabius/www/sitemap-1.txt';
  await writeFile(sitemapFileName, sitemap);
  await exec(`gzip -f ${sitemapFileName}`);
}

generateSitemap()
    .then(() => console.log('Done'))
    .catch(error => console.error(error));
