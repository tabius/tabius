import {promisify} from 'util';
import {readDbConfig} from '@server/db/db-config';
import {MOUNT_COLLECTION_PREFIX, MOUNT_SONG_PREFIX} from '@common/mounts';

const mysql = require('mysql2/promise');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const exec = promisify(require('child_process').exec);

async function generateSitemap() {
  const connection = await mysql.createConnection(readDbConfig());
  let sitemap = '';
  try {
    const [collectionRows] = await connection.execute('SELECT id, mount FROM collection');
    const collectionMountById = new Map<number, string>();
    for (const row of collectionRows) {
      collectionMountById.set(+row.id, row.mount);
      sitemap += `https://tabius.ru/${MOUNT_COLLECTION_PREFIX}${row.mount}\n`;
    }
    const [songRows] = await connection.execute('SELECT collection_id, mount FROM song');
    for (const row of songRows) {
      const collectionMount = collectionMountById.get(+row.collection_id);
      if (!collectionMount) {
        throw new Error(`Collection not found for song: ${JSON.stringify(row)}`);
      }
      sitemap += `https://tabius.ru/${MOUNT_SONG_PREFIX}${collectionMount}/${row.mount}\n`;
    }
  } finally {
    connection.end();
  }
  const sitemapFileName = '/opt/tabius/www/sitemap-1.txt';
  await writeFile(sitemapFileName, sitemap);
  await exec(`gzip -f ${sitemapFileName}`);
}

generateSitemap()
    .then(() => console.info('Done'))
    .catch(error => console.error(error));
