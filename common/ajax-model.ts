import {User, UserSettings} from '@common/user-model';
import {Collection, CollectionType, Song, SongDetails} from '@common/catalog-model';

export interface AjaxSessionInfo {
  userId: string|undefined;
}

export interface TabiusAjaxResponse {
  session?: AjaxSessionInfo;
}

export interface LoginResponse extends TabiusAjaxResponse {
  readonly user: User|undefined;
  readonly settings: UserSettings;
}

export interface CreateCollectionRequest {
  name: string;
  mount: string;
  type: CollectionType;
}

export interface CreateCollectionResponse extends TabiusAjaxResponse {
  /** List of all collections. */
  collections: Collection[];
}

export interface UpdateSongRequest extends TabiusAjaxResponse {
  song: Song;
  details: SongDetails;
}

export interface UpdateSongResponse extends TabiusAjaxResponse {
  song: Song;
  details: SongDetails;
  /** All songs in the primary song collection.*/
  songs: Song[];
}

export interface DeleteSongResponse extends TabiusAjaxResponse {
  collectionId: number;
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
  collectionName: string;
  collectionMount: string;
  songMount: string;
  snippet: string;
  matchType: FullTextSongSearchResultMatchType;
}
