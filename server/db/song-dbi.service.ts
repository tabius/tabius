import {Injectable} from '@nestjs/common';
import {Song, SongDetails} from '@common/catalog-model';
import {DbService} from './db.service';
import {getTranslitLowerCase} from '@common/util/seo-translit';

interface SongRow {
  id: number;
  mount: string;
  title: string;
  content: string;
  media_links: string;
  collection_id: number;
  forum_topic_id: number;
  version: number;
}

interface IdRow {
  id: number;
}

const SONG_FIELDS = 's.id, s.collection_id, s.mount, s.title, s.forum_topic_id, s.version';
const SONG_DETAILS_FIELDS = `s.id, s.content, s.media_links, s.version`;
const SELECT_SONG_SQL = `SELECT ${SONG_FIELDS} FROM song s`;
const SELECT_SONG_DETAILS_SQL = `SELECT ${SONG_DETAILS_FIELDS} FROM song s`;

@Injectable()
export class SongDbi {

  constructor(private readonly db: DbService) {
  }

  getSongs(songIds: readonly number[]): Promise<Song[]> {
    const idList = songIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_SQL} WHERE s.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) => rows.map(row2Song));
  }

  getSongsDetails(songIds: readonly number[]): Promise<SongDetails[]> {
    const idList = songIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_DETAILS_SQL} WHERE s.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) => rows.map(row2SongDetails));
  }

  private getSongsByCollectionId(collectionId: number): Promise<Song[]> {
    return this.db.pool.promise()
        .query(`${SELECT_SONG_SQL} WHERE s.collection_id = ? ORDER BY s.id`, [collectionId])
        .then(([rows]: [SongRow[]]) => rows.map(row2Song));
  }

  private getSongsBySecondaryCollectionId(collectionId: number): Promise<Song[]> {
    return this.db.pool.promise()
        .query(`${SELECT_SONG_SQL} WHERE s.id IN (SELECT song_id FROM secondary_song_collections WHERE collection_id = ?) ORDER BY s.id`, [collectionId])
        .then(([rows]: [SongRow[]]) => rows.map(row2Song));
  }

  async getPrimaryAndSecondarySongIdsByCollectionId(collectionId: number): Promise<number[]> {
    const [primarySongsIds, secondarySongIds] = await Promise.all([
      this.db.pool.promise().query('SELECT id FROM song WHERE collection_id = ?', [collectionId])
          .then(([rows]: [IdRow[]]) => rows.map(r => r.id)),
      this.db.pool.promise().query('SELECT song_id AS id FROM secondary_song_collections WHERE collection_id = ?', [collectionId])
          .then(([rows]: [IdRow[]]) => rows.map(r => r.id)),
    ]);
    return [...primarySongsIds, ...secondarySongIds];
  }

  /** Returns all songs in the collection. */
  async getPrimaryAndSecondarySongsByCollectionId(collectionId: number): Promise<Song[]> {
    const [primarySongs, secondarySongs] = await Promise.all([
      this.getSongsByCollectionId(collectionId),
      this.getSongsBySecondaryCollectionId(collectionId),
    ]);
    return [...primarySongs, ...secondarySongs];
  }


  async create(song: Song, details: SongDetails): Promise<number> {
    const con$$ = this.db.pool.promise();
    const mount = await generateUniqueSongMount(song, con$$);
    return con$$
        .query('INSERT INTO song(collection_id, mount, title, content, media_links) VALUES(?,?,?,?,?)',
            [song.collectionId, mount, song.title, details.content, packLinks(details.mediaLinks)])
        .then(([result]) => result.insertId);
  }

  async update(title: string, details: SongDetails): Promise<void> {
    await this.db.pool.promise()
        .query('UPDATE song SET title = ?, content = ?, media_links = ?, version = version + 1 WHERE id = ?',
            [title, details.content, packLinks(details.mediaLinks), details.id]);
  }

  async delete(songId: number): Promise<void> {
    await Promise.all([
      this.db.pool.promise().query('DELETE FROM song WHERE id = ?', [songId]),
      this.db.pool.promise().query('DELETE FROM secondary_song_collections WHERE song_id = ?', [songId]),
    ]);
  }

  async addSongToSecondaryCollection(songId: number, collectionId: number): Promise<void> {
    //TODO: handle duplicates.
    //TODO: do not add into secondary when song is in primary.
    await this.db.pool.promise()
        .query('INSERT INTO secondary_song_collections(song_id, collection_id) VALUES(?,?)',
            [songId, collectionId]);
  }

  async removeSongFromSecondaryCollection(songId: number, collectionId: number): Promise<void> {
    await this.db.pool.promise()
        .query('DELETE FROM secondary_song_collections WHERE song_id = ? AND collection_id = ?',
            [songId, collectionId]);

  }

  async updateSongsPrimaryCollection(songIds: number[], collectionId: number): Promise<void> {
    const idList = songIds.join(',');
    await this.db.pool.promise().query(`UPDATE song SET collection_id = ? WHERE id IN ( ${idList} )`, [collectionId]);
  }

  async removeAllSongsFromSecondaryCollection(secondaryCollectionId: number): Promise<void> {
    await this.db.pool.promise()
        .query(`DELETE FROM secondary_song_collections WHERE collection_id = ?`,
            [secondaryCollectionId]);
  }
}

function row2Song(row: SongRow): Song {
  return {
    id: row.id,
    collectionId: row.collection_id,
    mount: row.mount,
    title: row.title,
    tid: row.forum_topic_id,
    version: row.version,
  };
}

function row2SongDetails(row: SongRow): SongDetails {
  return {
    id: row.id,
    content: row.content,
    mediaLinks: unpackLinks(row.media_links),
    version: row.version,
  };
}

function packLinks(links: string[]): string {
  return links.filter(l => l.length > 0).join('\n');
}

function unpackLinks(packedLinks: string): string[] {
  return packedLinks.length === 0 ? [] : packedLinks.split('\n');
}

async function generateUniqueSongMount(song: Song, con$$: any): Promise<string> {
  const allMounts = await con$$.query('SELECT mount FROM song WHERE collection_id = ?', [song.collectionId])
      .then(([rows]) => rows.map(row => row.mount));
  const allMountsSet = new Set<string>(allMounts);
  let baseMount = getTranslitLowerCase(song.title);
  if (baseMount.length === 0) {
    throw new Error(`Failed to generate song mount for song: ${song.title}`);
  }
  for (let i = 0; ; i++) {
    const mount = baseMount + (i === 0 ? '' : '_' + i);
    if (!allMountsSet.has(mount)) {
      return mount;
    }
  }
}
