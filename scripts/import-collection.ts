import {readDbConfig} from '@server/db/db-config';
import {MIN_COLLECTION_MOUNT_LENGTH, MIN_SONG_MOUNT_LENGTH} from '@common/catalog-model';
import {promisify} from 'util';
import {getTranslitLowerCase} from '@common/util/seo-translit';
import {INVALID_ID} from '@common/common-constants';
import {packMediaLinks} from '@server/db/song-dbi.service';

const fs = require('fs');
const mysql = require('mysql2/promise');
const [readDirAsync, readFileAsync] = [fs.readdir, fs.readFile].map(promisify);

interface CollectionImport {
  id: number;
  mount: string;
  name: string;
  type: number;
}

interface SongImport {
  name: string;
  text: string;
  media: string;
  mount: string;
}

async function main() {
  const dir = getCollectionDir();

  const collection = await loadCollection(dir);
  console.log(`Read collection: ${collection.name}`);

  const songs = await loadSongs(dir);
  console.log(`Found ${songs.length} songs`);

  const connection = await mysql.createConnection(readDbConfig());
  try {
    assignMounts(collection, songs);
    await validateImportDataAndAssignCollectionId(collection, songs, connection);
    if (collection.id === INVALID_ID) {
      await createCollection(collection, connection);
    } else {
      console.log(`Adding song to the existing collection: ${collection.id}/${collection.mount}`);
    }
    await createSongs(collection, songs, connection);
  } finally {
    connection.end();
  }
}

main()
    .then(() => console.info('Done'))
    .catch(error => console.error(error));


function getCollectionDir(): string {
  return process.argv[2];
}

async function readJsonFromFile<T>(path: string): Promise<T> {
  const content = await readFileAsync(path);
  return JSON.parse(content) as T;
}

async function loadCollection(dir: string): Promise<CollectionImport> {
  return await readJsonFromFile<CollectionImport>(dir + '/index.json');
}

async function loadSongs(dir: string): Promise<SongImport[]> {
  const files = await readDirAsync(dir);
  return Promise.all(
      files.filter(f => f !== 'index.json')
          .map(async (f) => await readJsonFromFile<SongImport>(`${dir}/${f}`))
  );
}

function assignMounts(collection: CollectionImport, songs: SongImport[]): void {
  collection.mount = getTranslitLowerCase(collection.name);
  for (const song of songs) {
    song.mount = getTranslitLowerCase(song.name);
  }
}

async function validateImportDataAndAssignCollectionId(collection: CollectionImport, songs: SongImport[], connection: any): Promise<void> {
  if (collection.type <= 0 || collection.type >= 3) {
    throw new Error(`Illegal collection type: ${collection.type}`);
  }

  if (collection.mount.length < MIN_COLLECTION_MOUNT_LENGTH) {
    throw new Error('Invalid collection mount: ' + JSON.stringify(collection));
  }

  const [collectionIdRows] = await connection.execute(`SELECT id FROM collection WHERE mount = '${collection.mount}'`);
  collection.id = collectionIdRows.length === 1 ? collectionIdRows[0].id || INVALID_ID : INVALID_ID;

  for (const song of songs) {
    if (collection.mount.length < MIN_SONG_MOUNT_LENGTH) {
      throw new Error('Invalid song mount: ' + JSON.stringify(song));
    }
    if (collection.id !== INVALID_ID) {
      const [songIdRow] = await connection.execute(`SELECT id FROM song WHERE collection_id = ${collection.id} AND mount = '${song.mount}'`);
      if (songIdRow.length > 0 && songIdRow[0].id > 0) {
        throw new Error(`Duplicate song mount in the DB: ${songIdRow[0].id}, song: ${song.mount}`);
      }
    }
  }
}

async function createCollection(collection: CollectionImport, connection: any): Promise<void> {
  const [result] = await connection.execute('INSERT INTO collection(name, type, mount, listed) VALUES (?,?,?,?)',
      [collection.name, collection.type, collection.mount, 1]);
  collection.id = result.insertId;
  console.log('Created new collection: ', JSON.stringify(collection));
}

async function createSongs(collection: CollectionImport, songs: SongImport[], connection: any): Promise<void> {
  for (const song of songs) {
    console.log('create song: ' + song.name + '/' + song.mount);
    await connection.execute('INSERT INTO song(collection_id, mount, title, content, media_links) VALUES(?,?,?,?,?)',
        [collection.id, song.mount, song.name, song.text, packMediaLinks([song.media])]);
  }
}
