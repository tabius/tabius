import {promisify} from 'util';
import {readDbConfig} from '@server/db/db-config';
import {get, post} from 'request';
import {getArtistImageUrl, getNameFirstFormArtistName} from '@common/util/misc-utils';
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
const [getAsync, postAsync] = [get, post].map(promisify);

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
  tid: number;
}

async function main() {
  const connection = await mysql.createConnection(readDbConfig());
  try {
    // check that all artists have valid category
    // const [artistRows] = await connection.execute('SELECT id, name, mount, type, forum_category_id FROM artist LIMIT 1') as ArtistCategoryRow[][];
    const [artistRows] = await connection.execute('SELECT id, name, mount, type, forum_category_id FROM artist') as ArtistCategoryRow[][];
    console.log('Read ' + artistRows.length + ' artists from DB');
    const artistById = new Map<number, ArtistCategoryRow>();
    for (const artist of artistRows) {
      await syncArtistCategory(artist, connection);
      artistById.set(artist.id, artist);
    }

    // check that all songs have valid topics.
    // const [songRows] = await connection.execute(`# SELECT id, artist_id, title, mount, forum_topic_id FROM song WHERE artist_id = ${artistRows[0].id} LIMIT 1`);
    const [songRows] = await connection.execute(`SELECT id, artist_id, title, mount, forum_topic_id FROM song`);
    for (const song of songRows) {
      await syncSongTopic(song, connection, artistById);
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

function getArtistPageUrl(artistMount: string): string {
  return `https://tabius.ru/artist/${artistMount}`;
}

async function syncArtistCategory(artist: ArtistCategoryRow, connection: any): Promise<void> {
  const category = artist.forum_category_id === 0 ? 'Not found' : await getCategory(artist.forum_category_id);
  if (typeof category === 'string') { // not found
    const altArtistName = getNameFirstFormArtistName(artist);
    const options = {
      json: true,
      headers: {
        Authorization: `Bearer ${forumAuthToken}`
      },
      form: {
        name: artist.name,
        description: `${altArtistName} - обсуждаем подбор аккордов и новинки. ${getArtistPageUrl(artist.mount)}`,
        parentCid: ALL_ARTISTS_CATEGORY_ID,
        backgroundImage: getArtistImageUrl(artist.mount)
      },
    };
    const categoryResponse = (await postAsync(forumUrl + '/api/v2/categories', options)).body;
    if (categoryResponse.code !== 'ok') {
      console.log('Failed to create artist category', artist, categoryResponse);
      throw new Error(`Failed to create artist category: ${artist.id}`);
    }
    const category = categoryResponse.payload as ForumCategory;
    artist.forum_category_id = category.cid;
    await connection.execute(`UPDATE artist SET forum_category_id = ${category.cid} WHERE id = ${artist.id}`);
    console.log(`Created new category for ${artist.mount}`);
  } else {
    // nothing to update today.
  }
}

async function getTopic(id: number): Promise<ForumTopic|string> {
  return (await getAsync(`${forumUrl}/api/topic/${id}`, {json: true})).body;
}

function getSongPageUrl(artistMount: string, songMount: string): string {
  return `https://tabius.ru/song/${artistMount}/${songMount}`;
}

async function syncSongTopic(song: SongTopicRow, connection: any, artistById: Map<number, ArtistCategoryRow>): Promise<void> {
  const topic = song.forum_topic_id === 0 ? 'Not found' : await getTopic(song.forum_topic_id);
  if (typeof topic === 'string') { // not found
    const artist = artistById.get(song.artist_id);
    if (artist === undefined) {
      throw new Error(`Failed to find artist for song + ${JSON.stringify(song)}`);
    }
    const artistTypeName = artist.type === ArtistType.Band ? 'группа' : 'исполнитель';
    const options = {
      json: true,
      headers: {
        Authorization: `Bearer ${forumAuthToken}`
      },
      form: {
        cid: artist.forum_category_id,
        title: song.title,
        content: `В этой теме обсуждаем и улучшаем подбор аккордов для песни ` +
            `[«${song.title}»](${getSongPageUrl(artist.mount, song.mount)}), ` +
            `${artistTypeName}: [${getNameFirstFormArtistName(artist)}](${getArtistPageUrl(artist.mount)})`,
      },
    };
    const topicResponse = (await postAsync(forumUrl + '/api/v2/topics', options)).body;
    if (topicResponse.code !== 'ok') {
      console.log('Failed to create song topic', song, topicResponse);
      throw new Error(`Failed to create song topic: ${song.id}`);
    }
    const topic = topicResponse.payload.topicData as ForumTopic;
    song.forum_topic_id = topic.tid;
    await connection.execute(`UPDATE song SET forum_topic_id = ${topic.tid} WHERE id = ${song.id}`);
    console.log(`Created new topic for ${artist.mount}/${song.mount}`);
  } else {
    // nothing to update today.
  }
}
