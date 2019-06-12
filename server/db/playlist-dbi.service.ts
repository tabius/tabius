import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {toArrayOfInts} from '@common/util/misc_utils';
import Hashids from 'hashids';
import {Playlist} from '@common/user-model';
import {CreatePlaylistRequest} from '@common/ajax-model';

interface PlaylistRow {
  id: number;
  user_id: string;
  name: string;
  mount: string;
  shared: boolean;
  song_ids: string;
  version: number;
}

const SELECT_FROM_PLAYLIST_SQL = 'SELECT id, user_id, name, mount, song_ids, version FROM playlist';

@Injectable()
export class PlaylistDbi {

  constructor(private readonly db: DbService) {
  }

  getPlaylists(userId: string): Promise<Playlist[]> {
    return this.db.pool.promise()
        .query(`${SELECT_FROM_PLAYLIST_SQL} WHERE user_id = ?`, [userId])
        .then(([rows]: [PlaylistRow[]]) => rows.map(row => row2Playlist(row)));
  }

  create(userId: string, playlist: CreatePlaylistRequest): Promise<void> {
    const mount = generateRandomPlaylistMount();
    return this.db.pool.promise()
        .query('INSERT INTO playlist(user_id, name, mount, song_ids) VALUES (?, ?, ?, ?)',
            [userId, playlist.name, mount, playlist.songIds.join(',')]);
  }

  update(userId: string, playlist: Playlist): Promise<void> {
    return this.db.pool.promise() // Note: it is important to pass user-id too to avoid non-authorized updates.
        .query('UPDATE playlist SET name = ?, song_ids = ?, version = version + 1 WHERE id = ? AND user_id = ?',
            [playlist.name, playlist.songIds.join(','), playlist.id, userId]);
  }

  delete(userId: string, playlistId: number): Promise<void> {
    return this.db.pool.promise() // Note: it is important to pass user-id too to avoid non-authorized updates.
        .query('DELETE FROM playlist WHERE id = ? AND user_id = ?', [playlistId, userId]);
  }

  getPlaylistByMount(mount: string, userId: string|undefined): Promise<Playlist|undefined> {
    return this.db.pool.promise()
        .query(`${SELECT_FROM_PLAYLIST_SQL} WHERE mount = ? AND (user_id = ? OR shared = 1)`, [mount, userId || -1])
        .then(([rows]: [PlaylistRow[]]) => rows.length === 0 ? undefined : row2Playlist(rows[0]));
  }

  getPlaylistById(playlistId: number, userId: string|undefined): Promise<Playlist|undefined> {
    return this.db.pool.promise()
        .query(`${SELECT_FROM_PLAYLIST_SQL} WHERE id = ? AND (user_id = ? OR shared = 1)`, [playlistId, userId || -1])
        .then(([rows]: [PlaylistRow[]]) => rows.length === 0 ? undefined : row2Playlist(rows[0]));
  }
}

function generateRandomPlaylistMount(): string {
  const hashIds = new Hashids('salt', 5);
  return hashIds.encode(Date.now());
}

function row2Playlist(row: PlaylistRow): Playlist {
  return {id: row.id, userId: row.user_id, name: row.name, mount: row.mount, songIds: toArrayOfInts(row.song_ids, ','), version: row.version};
}
