import {promisify} from 'util';
import {get, post, put} from 'request';
import {getNameFirstFormArtistName} from '@common/util/misc-utils';
import {CollectionType} from '@common/catalog-model';
import {MOUNT_COLLECTION_PREFIX} from '@common/mounts';
import {SERVER_CONFIG} from '@server/util/server-config';

const FORUM_URL = process.env.TABIUS_FORUM_URL;
if (FORUM_URL === undefined) {
  throw new Error('TABIUS_FORUM_URL is required.');
}

const BACKEND_URL = process.env.TABIUS_FORUM_URL;
if (BACKEND_URL === undefined) {
  throw new Error('TABIUS_BACKEND_URL is required.');
}

const forumAuthToken = process.env.TABIUS_NODE_BB_AUTH_TOKEN;
if (forumAuthToken === undefined) {
  throw new Error('TABIUS_NODE_BB_AUTH_TOKEN is required.');
}

const ALL_COLLECTIONS_CATEGORY_ID = 5;
const mysql = require('mysql2/promise');
const [getAsync, postAsync, putAsync] = [get, post, put].map(promisify);

interface CollectionRow {
  id: number;
  type: CollectionType,
  name: string;
  mount: string;
  forum_category_id: number;
}

interface ForumCategory {
  cid: number;
  parentCid: number;
  name: string;
  description: string;
  icon: string;
  bgColor: string;
  color: string;
  slug: string;
  isSection: number
}

interface SongTopicRow {
  id: number;
  collection_id: number;
  title: string;
  mount: string;
  forum_topic_id: number;
}

interface ForumTopic {
  tid: number;
}

async function main() {
  const connection = await mysql.createConnection(SERVER_CONFIG.dbConfig);
  try {
    // check that all collections have valid category
    const [collectionsRows] = await connection.execute('SELECT id, name, mount, type, forum_category_id FROM collection ' +
        'WHERE listed = 1 AND id IN (SELECT DISTINCT collection_id FROM song)') as CollectionRow[][];
    console.info(`Read ${collectionsRows.length} collections from DB`);
    const collectionById = new Map<number, CollectionRow>();
    for (const collection of collectionsRows) {
      await syncCollectionTopic(collection, connection);
      collectionById.set(collection.id, collection);
    }

    // check that all songs in listed collections have valid topics.
    const [songRows] = await connection.execute('SELECT id, collection_id, title, mount, forum_topic_id FROM song ' +
        'WHERE collection_id IN (SELECT id FROM collection WHERE listed = 1)');
    for (const song of songRows) {
      await syncSongTopic(song, connection, collectionById);
    }
  } finally {
    connection.end();
  }
}

main()
    .then(() => console.info('Done'))
    .catch(error => console.error(error));

async function getCategory(id: number): Promise<ForumCategory|string> {
  return (await getAsync(`${FORUM_URL}/api/category/${id}`, {json: true})).body;
}

function getCollectionPageUrl(collectionMount: string): string {
  return `https://tabius.ru/${MOUNT_COLLECTION_PREFIX}${collectionMount}`;
}

async function syncCollectionTopic(collection: CollectionRow, connection: any): Promise<void> {
  const category = collection.forum_category_id === 0 ? 'Not found' : await getCategory(collection.forum_category_id);

  const altCollectionName = getNameFirstFormArtistName(collection);
  const putPostPayload: any = {
    json: true,
    headers: {
      Authorization: `Bearer ${forumAuthToken}`
    },
    form: {
      name: collection.name,
      description: `${altCollectionName} - обсуждаем подбор аккордов и новинки. ${getCollectionPageUrl(collection.mount)}`,
      parentCid: ALL_COLLECTIONS_CATEGORY_ID,
      backgroundImage: `${BACKEND_URL}/images/collection/profile/${collection.mount}.jpg`,
    },
  };

  if (typeof category === 'string') { // not found
    const categoryResponse = (await postAsync(`${FORUM_URL}/api/v2/categories`, putPostPayload)).body;
    if (categoryResponse.code !== 'ok') {
      console.error('Failed to create collection category', collection, categoryResponse);
      throw new Error(`Failed to create collection category: ${collection.id}`);
    }
    const category = categoryResponse.payload as ForumCategory;
    collection.forum_category_id = category.cid;
    await connection.execute(`UPDATE collection SET forum_category_id = ${category.cid} WHERE id = ${collection.id}`);
    console.info(`Created new category for ${collection.mount}`);
  } else {
    const categoryResponse = (await putAsync(`${FORUM_URL}/api/v2/categories/${collection.forum_category_id}`, putPostPayload)).body;
    if (categoryResponse.code !== 'ok') {
      console.error('Failed to update collection category', collection, categoryResponse);
      throw new Error(`Failed to update collection category: ${collection.id}`);
    }
  }
}

async function getTopic(id: number): Promise<ForumTopic|string> {
  return (await getAsync(`${FORUM_URL}/api/topic/${id}`, {json: true})).body;
}

function getSongPageUrl(collectionMount: string, songMount: string): string {
  return `https://tabius.ru/song/${collectionMount}/${songMount}`;
}

const MIN_NODEBB_TOPIC_TITLE_LENGTH = 3;

async function syncSongTopic(song: SongTopicRow, connection: any, collectionById: Map<number, CollectionRow>): Promise<void> {
  const topic = song.forum_topic_id === 0 ? 'Not found' : await getTopic(song.forum_topic_id);

  const toSafeSongTitle = (title: string): string => {
    return title.length >= MIN_NODEBB_TOPIC_TITLE_LENGTH ? title : `"${title}"`;
  };

  if (typeof topic === 'string') { // not found
    const collection = collectionById.get(song.collection_id);
    if (collection === undefined) {
      throw new Error(`Failed to find collection for song + ${JSON.stringify(song)}`);
    }
    const collectionTypeName = collection.type === CollectionType.Person
        ? 'исполнитель'
        : (collection.type === CollectionType.Band
            ? 'группа'
            : 'коллекция');
    const options = {
      json: true,
      headers: {
        Authorization: `Bearer ${forumAuthToken}`
      },
      form: {
        cid: collection.forum_category_id,
        title: toSafeSongTitle(song.title),
        content: `В этой теме обсуждаем и улучшаем подбор аккордов для песни ` +
            `[«${song.title}»](${getSongPageUrl(collection.mount, song.mount)}), ` +
            `${collectionTypeName}: [${getNameFirstFormArtistName(collection)}](${getCollectionPageUrl(collection.mount)})`,
      },
    };
    const topicResponse = (await postAsync(FORUM_URL + '/api/v2/topics', options)).body;
    if (topicResponse.code !== 'ok') {
      console.error('Failed to create song topic', song, topicResponse);
      throw new Error(`Failed to create song topic: ${song.id}`);
    }
    const topic = topicResponse.payload.topicData as ForumTopic;
    song.forum_topic_id = topic.tid;
    await connection.execute(`UPDATE song SET forum_topic_id = ${topic.tid} WHERE id = ${song.id}`);
    console.info(`Created new topic for ${collection.mount}/${song.mount}`);
  } else {
    // nothing to update today.
  }
}
