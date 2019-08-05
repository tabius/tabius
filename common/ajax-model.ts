import {Playlist, User, UserSettings} from '@common/user-model';
import {Song, SongDetails} from '@common/artist-model';

export interface AjaxSessionInfo {
  userId: string|undefined;
}

export interface TabiusAjaxResponse {
  session?: AjaxSessionInfo;
}

export interface LoginResponse extends TabiusAjaxResponse {
  readonly user: User|undefined;
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


export interface UpdateSongRequest extends TabiusAjaxResponse {
  song: Song;
  details: SongDetails;
}

export interface UpdateSongResponse extends TabiusAjaxResponse {
  song: Song;
  details: SongDetails;
  /** All artist songs.*/
  songs: Song[];
}

export interface DeleteSongResponse extends TabiusAjaxResponse {
  artistId: number;
  songs: Song[];
}


export interface FullTextSongSearchRequest extends TabiusAjaxResponse {
  text: string;
}

export interface FullTextSongSearchResponse extends TabiusAjaxResponse {
  results: FullTextSongSearchResult[];
}

export const MAX_FULL_TEXT_SEARCH_TITLE_RESULTS = 50;
export const MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS = 100;

export type FullTextSongSearchResultMatchType = 'title'|'content';

export interface FullTextSongSearchResult extends TabiusAjaxResponse {
  songId: number;
  songTitle: string;
  artistName: string;
  artistMount: string;
  songMount: string;
  snippet: string;
  matchType: FullTextSongSearchResultMatchType;
}
