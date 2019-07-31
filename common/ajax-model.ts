import {Playlist, User, UserSettings} from '@common/user-model';
import {Song, SongDetails} from '@common/artist-model';

export interface LoginResponse {
  readonly user?: User;
  readonly settings: UserSettings;
  readonly playlists: Playlist[];
}

export interface CreatePlaylistRequest {
  readonly name: string;
  readonly shared: boolean;
  readonly songIds: number[];
}

export type CreatePlaylistResponse = Playlist[];
export type UpdatePlaylistResponse = Playlist[];
export type DeletePlaylistResponse = Playlist[];


export interface UpdateSongRequest {
  song: Song;
  details: SongDetails;
}

export interface UpdateSongResponse {
  song: Song;
  details: SongDetails;
  /** All artist songs.*/
  songs: Song[];
}

export interface DeleteSongResponse {
  artistId: number;
  songs: Song[];
}


export interface FullTextSongSearchRequest {
  text: string;
}

export interface FullTextSongSearchResponse {
  results: FullTextSongSearchResult[];
}

export type FullTextSongSearchResultMatchType = 'title'|'content';

export interface FullTextSongSearchResult {
  songId: number;
  songTitle: string;
  artistName: string;
  artistMount: string;
  songMount: string;
  snippet: string;
  matchType: FullTextSongSearchResultMatchType;
}
