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
  /** Id of the created collection. */
  collectionId: number;
  /** List of all collections (for the catalog or a user). */
  collections: Collection[];
}

export interface UpdateCollectionRequest {
  id: number,
  name: string;
  mount: string;
}

export interface UpdateCollectionResponse extends TabiusAjaxResponse {
  /** List of all collections (for the catalog or a user). */
  collections: Collection[];
}

export interface DeleteCollectionResponse extends TabiusAjaxResponse {
  /** List of all collections (for the catalog or a user). */
  collections: Collection[];
}

export interface UpdateSongRequest extends TabiusAjaxResponse {
  song: Song;
  details: SongDetails;
}

export interface UpdateSongResponse extends TabiusAjaxResponse {
  song: Song;
  details: SongDetails;
  /** All songs (owned and secondary) in the primary song collection.*/
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

export interface AddSongToSecondaryCollectionRequest {
  songId: number;
  collectionId: number;
}

export interface AddSongToSecondaryCollectionResponse {
  songIds: number[];
}

export interface RemoveSongFromSecondaryCollectionRequest {
  songId: number;
  collectionId: number;
}

export interface RemoveSongFromSecondaryCollectionResponse {
  songIds: number[]
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
