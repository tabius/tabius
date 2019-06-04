import {promisify} from 'util';
import {readDbConfig} from '@server/db/db-config';
import {get, post, put} from 'request';
import {getArtistImageUrl, getNameFirstFormArtistName} from '@common/util/misc_utils';
import {ArtistType} from '@common/artist-model';

const forumUrl = process.env.TABIUS_FORUM_URL;
if (forumUrl === undefined) {
  throw new Error('TABIUS_FORUM_URL is required.');
}
const forumAuthToken = process.env.TABIUS_NODE_BB_AUTH_TOKEN;
if (forumAuthToken === undefined) {
  throw new Error('TABIUS_NODE_BB_AUTH_TOKEN is required.');
}

const ALL_ARTISTS_CATEGORY_ID = 5;
const mysql = require('mysql2/promise');
const [getAsync, postAsync, putAsync] = [get, post, put].map(promisify);

interface ArtistCategoryRow {
  id: number;
  type: ArtistType,
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
  artist_id: number;
  title: string;
  mount: string;
  forum_topic_id: number;
}

interface ForumTopic {

}

async function main() {
  const connection = await mysql.createConnection(readDbConfig());
  try {
    // check that all artists have valid category
    const [artistRows] = await connection.execute('SELECT id, name, mount, type, forum_category_id FROM artist LIMIT 1') as ArtistCategoryRow[][];
    console.log('Read ' + artistRows.length + ' artists from DB');
    const forumCategoryIdByArtistId = new Map<number, number>();
    const mountByArtistId = new Map<number, string>();
    for (const artist of artistRows) {
      await syncArtistCategory(artist, connection);
      forumCategoryIdByArtistId.set(artist.id, artist.forum_category_id);
      mountByArtistId.set(artist.id, artist.mount);
    }

    // check that all songs have valid topics.
    const [songRows] = await connection.execute(`SELECT id, artist_id, title, mount, forum_topic_id mount FROM song WHERE artist_id = ${artistRows[0].id} LIMIT 1`);
    for (const song of songRows) {
      await syncSongTopic(song, connection, forumCategoryIdByArtistId, mountByArtistId);
    }
  } finally {
    connection.close();
  }
}

main()
    .then(() => console.log('Done'))
    .catch(error => console.error(error));

async function getCategory(id: number): Promise<ForumCategory|string> {
  return (await getAsync(`${forumUrl}/api/category/${id}`, {json: true})).body;
}

function getArtistUrl(artist: ArtistCategoryRow): string {
  return `https://tabius.ru/artist/${artist.mount}`;
}

async function syncArtistCategory(artist: ArtistCategoryRow, connection: any): Promise<void> {
  const category = artist.forum_category_id === 0 ? 'Not found' : await getCategory(artist.forum_category_id);
  if (typeof category === 'string') { // not found
    const altArtistName = getNameFirstFormArtistName(artist);
    console.log(forumAuthToken);
    const options = {
      json: true,
      headers: {
        Authorization: `Bearer ${forumAuthToken}`
      },
      form: {
        name: artist.name,
        description: `${altArtistName} - обсуждаем подбор аккордов и новинки. ${getArtistUrl(artist)}`,
        parentCid: ALL_ARTISTS_CATEGORY_ID,
        backgroundImage: getArtistImageUrl(artist.mount)
      },
    };
    const categoryResponse = (await postAsync(forumUrl + '/api/v2/categories', options)).body;
    if (categoryResponse.code !== 'ok') {
      console.log('Failed to create artist category ', artist, categoryResponse);
      throw new Error(`Failed to create artist category: ${artist.id}`);
    }
    const category = categoryResponse.payload as ForumCategory;
    artist.forum_category_id = category.cid;
    await connection.execute(`UPDATE artist SET forum_category_id = ${category.cid} WHERE id = ${artist.id}`);
    console.log('Created new category for ', artist);
  } else {
    // nothing to update today.
  }
}

async function getTopic(id: number): Promise<ForumTopic|string> {
  return (await getAsync(`${forumUrl}/api/category/${id}`, {json: true})).body;
}

async function syncSongTopic(song: SongTopicRow, connection: any, forumCategoryIdByArtistId: Map<number, number>, mountByArtistId: Map<number, string>): Promise<void> {
  //todo
}
