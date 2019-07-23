import {Injectable} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {DbService} from './db.service';
import {SongUpdateResponse} from '@common/ajax-model';
import {getTranslitLowerCase} from '@common/util/seo_translit';

interface SongRow {
  id: number;
  mount: string;
  title: string;
  content: string;
  media_links: string;
  artist_id: number;
  forum_topic_id: number;
  version: number;
}

const SONG_FIELDS = 's.id, s.artist_id, s.mount, s.title, s.forum_topic_id, s.version';
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
        .then(([rows]: [SongRow[]]) => rows.map(row => (row2Song(row))));
  }

  getSongsDetails(songIds: readonly number[]): Promise<SongDetails[]> {
    const idList = songIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_DETAILS_SQL} WHERE s.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) => rows.map(row => (row2SongDetails(row))));
  }

  getSongsByArtistIds(artistIds: readonly number[]): Promise<Song[]> {
    const idList = artistIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_SQL}, artist a WHERE s.artist_id = a.id AND a.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) => rows.map(row => row2Song(row)));
  }

  async create(song: Song, details: SongDetails): Promise<SongUpdateResponse> {
    const con$$ = this.db.pool.promise();
    const mount = await generateUniqueSongMount(song, con$$);
    await con$$.query('INSERT INTO song(artist_id, mount, title, content, media_links) VALUES(?,?,?,?,?)',
        [song.artistId, mount, song.title, details.content, packLinks(details.mediaLinks)]);

    const id = await con$$.query('SELECT LAST_INSERT_ID() as id')
        .then(([rows]) => rows[0]['id']);

    const [songFromDb, detailsFromDb] = await Promise.all([this.getSongs([id]), this.getSongsDetails([id])]);
    if (songFromDb.length === 0 || detailsFromDb.length === 0) {
      throw `Failed to create song ${details.id}`;
    }
    return {song: songFromDb[0], details: detailsFromDb[0]};
  }

  async update(title: string, details: SongDetails): Promise<SongUpdateResponse> {
    await this.db.pool.promise()
        .query('UPDATE song SET title = ?, content = ?, media_links = ?, version = version + 1 WHERE id = ?',
            [title, details.content, packLinks(details.mediaLinks), details.id]);
    const ids = [details.id];
    const [songFromDb, detailsFromDb] = await Promise.all([this.getSongs(ids), this.getSongsDetails(ids)]);
    if (songFromDb.length === 0 || detailsFromDb.length === 0) {
      throw `Song not found ${details.id}`;
    }
    return {song: songFromDb[0], details: detailsFromDb[0]};
  }
}


function row2Song(row: SongRow): Song {
  return {
    id: row.id,
    artistId: row.artist_id,
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
  const allMounts = await con$$.query('SELECT mount FROM song WHERE artist_id = ?', [song.artistId])
      .then(([rows]) => rows.map(row => row.mount));
  const allMountsSet = new Set<string>(allMounts);
  const baseMount = getTranslitLowerCase(song.title);
  for (let i = 0; ; i++) {
    const mount = baseMount + (i == 0 ? '' : '_' + i);
    if (!allMountsSet.has(mount)) {
      return mount;
    }
  }
}

