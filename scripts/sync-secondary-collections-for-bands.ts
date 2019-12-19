import {readDbConfig} from '@server/db/db-config';
import {toArrayOfInts} from '@common/util/misc-utils';

const mysql = require('mysql2/promise');

async function syncSecondaryCollectionsForBands() {
  const connection = await mysql.createConnection(readDbConfig());
  try {
    const [collectionRows] = await connection.execute('SELECT id, band_ids FROM collection WHERE band_ids !=\'\'');
    console.info(`Found ${collectionRows.length} collections with band ids`);
    for (const row of collectionRows) {
      await addMissedCollectionSongs(connection, toArrayOfInts(row.band_ids, ','), row.id,);
    }
  } finally {
    connection.end();
  }
}

async function addMissedCollectionSongs(connection: any, masterCollectionIds: number[], secondaryCollectionId: number): Promise<void> {
  for (const masterCollectionId of masterCollectionIds) {
    const sql = 'INSERT IGNORE INTO secondary_song_collections(song_id, collection_id) ' +
        ` SELECT id, ${secondaryCollectionId} FROM song WHERE collection_id = ${masterCollectionId}`;
    await connection.execute(sql);
  }
}

syncSecondaryCollectionsForBands()
    .then(() => console.info('Done'))
    .catch(error => console.error(error));
