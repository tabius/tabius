import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {Playlist} from '@common/user-model';
import {CreatePlaylistRequest} from '@common/ajax-model';

interface PlaylistRow {
  id: number;
  user_id: string;
  name: string;
  shared: boolean;
  version: number;
}

const SELECT_FROM_PLAYLIST_SQL = 'SELECT id, user_id, name, id, version FROM playlist';

@Injectable()
export class PlaylistDbi {

  constructor(private readonly db: DbService) {
  }

  async getPlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await this.db.pool.promise()
        .query(`${SELECT_FROM_PLAYLIST_SQL} WHERE user_id = ?`, [userId])
        .then(([rows]: [PlaylistRow[]]) => rows.map(row => row2Playlist(row)));
    // todo: optimize
    for (let i = 0; i < playlists.length; i++) {
      const songIds = await this.getPlaylistSongs(playlists[i].id);
      playlists[i] = {...playlists[i], songIds};
    }
    return playlists;
  }

  async create(userId: string, request: CreatePlaylistRequest): Promise<number> {
    const playlistId = await this.db.pool.promise()
        .query('INSERT INTO playlist(user_id, name, shared) VALUES (?, ?, ?)', [userId, request.name, request.shared ? 1 : 0])
        .then(([result]) => result.insertId);
    if (request.songIds.length > 0) {
      this.updatePlaylistSongs(playlistId, request.songIds, true);
    }
    return playlistId;
  }

  async update(userId: string, playlist: Playlist): Promise<void> {
    const result = await this.db.pool.promise() // Note: it is important to pass user-id too to avoid non-authorized updates.
        .query('UPDATE playlist SET name = ?, version = version + 1 WHERE id = ? AND user_id = ?', [playlist.name, playlist.id, userId])
        .then(([result]) => result);
    if (result.changedRows === 1) {
      await this.updatePlaylistSongs(playlist.id, playlist.songIds);
    }
  }

  async delete(userId: string, playlistId: number): Promise<void> {
    const result = await this.db.pool.promise() // Note: it is important to pass user-id too to avoid non-authorized updates.
        .query('DELETE FROM playlist WHERE id = ? AND user_id = ?', [playlistId, userId])
        .then(([result]) => result);
    if (result.affectedRows === 1) {
      await this.updatePlaylistSongs(playlistId, []);
    }
  }

  async getPlaylistById(userId: string|undefined, playlistId: number): Promise<Playlist|undefined> {
    let playlist = this.db.pool.promise()
        .query(`${SELECT_FROM_PLAYLIST_SQL} WHERE id = ? AND (user_id = ? OR shared = 1)`, [playlistId, userId || -1])
        .then(([rows]: [PlaylistRow[]]) => rows.length === 0 ? undefined : row2Playlist(rows[0]));
    if (playlist) {
      const songIds = await this.getPlaylistSongs(playlist.id);
      playlist = {...playlist, songIds};
    }
    return playlist;
  }

  async deleteSongFromAllPlaylists(songId: number): Promise<void> {
    const playlistIds: number[] = await this.db.pool.promise()
        .query('SELECT playlist_id FROM playlist_songs WHERE song_id = ?', [songId])
        .then(([rows]) => rows.map(row => row['playlist_id']));
    if (playlistIds.length === 0) {
      return;
    }
    await Promise.all([
      this.db.pool.promise().query('DELETE FROM playlist_songs WHERE song_id = ?', [songId]),
      this.db.pool.promise().query('UPDATE playlist SET version = version + 1 WHERE id IN (?)', [playlistIds.join(',')]),
    ]);
  }

  private async getPlaylistSongs(playlistId: number): Promise<number[]> {
    return this.db.pool.promise()
        .query('SELECT song_id FROM playlist_songs WHERE playlist_id = ?', [playlistId])
        .then(([rows]) => rows.map(row => row['song_id']));
  }

  private async updatePlaylistSongs(playlistId: number, songIds: readonly number[], newPlaylist?: boolean): Promise<void> {
    if (songIds.length === 0) {
      return this.db.pool.promise()
          .query('DELETE FROM playlist_songs WHERE playlist_id = ?', [playlistId]);
    }

    const songsIdsSet = new Set<number>(songIds);
    const dbSongIds = newPlaylist ? [] : await this.getPlaylistSongs(playlistId);
    const dbSongsIdsSet = new Set<number>(dbSongIds);

    const songsToInsert = songIds.filter(songId => !dbSongsIdsSet.has(songId));
    const songsToRemove = dbSongIds.filter(songId => !songsIdsSet.has(songId));

    await Promise.all(songsToInsert.map(songId => {
      this.db.pool.query('INSERT INTO playlist_songs(playlist_id, song_id) VALUES (?, ?)', [playlistId, songId]);
    }));

    if (songsToRemove.length > 0) {
      await this.db.pool.promise()
          .query('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id IN (?)', [playlistId, songsToRemove.join(',')]);
    }
  }
}

function row2Playlist(row: PlaylistRow): Playlist {
  return {id: row.id, userId: row.user_id, name: row.name, version: row.version, songIds: []};
}
