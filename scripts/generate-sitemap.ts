import {promisify} from 'util';
import {MOUNT_COLLECTION_PREFIX, MOUNT_SONG_PREFIX} from '@common/mounts';
import {getConfigFilePath, SERVER_CONFIG} from '@server/util/server-config';

const mysql = require('mysql2/promise');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const exec = promisify(require('child_process').exec);

const SITE_URL = `https://${SERVER_CONFIG.serverHost}`;

async function generateSitemap() {
  const connection = await mysql.createConnection(SERVER_CONFIG.dbConfig);
  let sitemap = '';
  try {
    const [collectionRows] = await connection.execute('SELECT id, mount FROM collection');
    const collectionMountById = new Map<number, string>();
    for (const row of collectionRows) {
      collectionMountById.set(+row.id, row.mount);
      sitemap += `${SITE_URL}/${MOUNT_COLLECTION_PREFIX}${row.mount}\n`;
    }
    const [songRows] = await connection.execute('SELECT collection_id, mount FROM song');
    for (const row of songRows) {
      const collectionMount = collectionMountById.get(+row.collection_id);
      if (!collectionMount) {
        throw new Error(`Collection not found for song: ${JSON.stringify(row)}`);
      }
      sitemap += `${SITE_URL}/${MOUNT_SONG_PREFIX}${collectionMount}/${row.mount}\n`;
    }
  } finally {
    connection.end();
  }
  const sitemapFileName = getConfigFilePath('www/sitemap-1.txt');
  await writeFile(sitemapFileName, sitemap);
  await exec(`gzip -f ${sitemapFileName}`);
}

generateSitemap()
    .then(() => console.info('Done'))
    .catch(error => console.error(error));
