import {Injectable} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {DbService} from './db.service';

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

  getSongs(songIds: number[]): Promise<Song[]> {
    const idList = songIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_SQL} WHERE s.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) => rows.map(row => (row2Song(row))));
  }

  getSongsDetails(songIds: number[]): Promise<SongDetails[]> {
    const idList = songIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_DETAILS_SQL} WHERE s.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) => rows.map(row => (row2SongDetails(row))));
  }

  getSongsByArtistIds(artistIds: number[]): Promise<Song[]> {
    const idList = artistIds.join(',');
    return this.db.pool.promise()
        .query(`${SELECT_SONG_SQL}, artist a WHERE s.artist_id = a.id AND a.id IN ( ${idList} )`)
        .then(([rows]: [SongRow[]]) =>
            rows.map(row => row2Song(row))
                .sort((s1, s2) => s1.title.localeCompare(s2.title)) //todo: move results sorting to the frontend
        );
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
    mediaLinks: row.media_links.split('\n'),
    version: row.version,
  };
}
