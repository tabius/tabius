import {User, UserSettings} from '@common/user-model';
import {Collection, CollectionType, Song, SongDetails} from '@common/catalog-model';
import {ChordTone} from '@app/utils/chords-lib';

export interface AjaxSessionInfo {
  userId: string|undefined;
}

export interface TabiusAjaxResponse {
  session?: AjaxSessionInfo;
}

export interface LoginResponse {
  readonly user: User|undefined;
  readonly settings: UserSettings;
}

export interface CreateListedCollectionRequest {
  name: string;
  mount: string;
  type: CollectionType;
}

export interface CreateListedCollectionResponse {
  /** Id of the created collection. */
  collectionId: number;
  /** List of all listed collections. */
  collections: Collection[];
}

export interface CreateUserCollectionRequest {
  name: string;
}

export interface CreateUserCollectionResponse {
  /** Id of the created collection. */
  collectionId: number;
  /** List of all user collections. */
  collections: Collection[];
}


export interface UpdateCollectionRequest {
  id: number,
  name: string;
  mount: string;
}

export interface UpdateCollectionResponse {
  /** List of all collections (for the catalog or a user). */
  collections: Collection[];
}

export interface DeleteUserCollectionResponse {
  userId: string;
  /** List of all collections (for the catalog or a user). */
  collections: Collection[];
}

export interface UpdateSongRequest {
  song: Song;
  details: SongDetails;
}

export interface UpdateSongSceneFlagRequest {
  songId: number;
  flag: boolean;
}

export interface UpdateSongResponse {
  song: Song;
  details: SongDetails;
  /** When provided: all songs (owned and secondary) in the primary song collection.*/
  songs?: Song[];
}

export interface DeleteSongResponseCollectionInfo {
  collectionId: number;

  /** List of all songs in the collection. */
  songs: Song[];
}

export interface DeleteSongResponse {
  /** Updated listing for the primary and all secondary song collections. */
  updatedCollections: DeleteSongResponseCollectionInfo[];
}


export interface FullTextSongSearchRequest {
  text: string;
}

export interface FullTextSongSearchResponse {
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

export interface MoveSongToAnotherCollectionRequest {
  songId: number;
  sourceCollectionId: number;
  targetCollectionId: number;
}

export interface MoveSongToAnotherCollectionResponse {
  song: Song;
  sourceCollectionSongIds: number[];
  targetCollectionSongIds: number[];
}

export interface RemoveSongFromSecondaryCollectionResponse {
  songIds: number[];
}

export const MAX_FULL_TEXT_SEARCH_TITLE_RESULTS = 50;
export const MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS = 50;

export type FullTextSongSearchResultMatchType = 'title'|'content';

export interface FullTextSongSearchResult {
  songId: number;
  songTitle: string;
  collectionName: string;
  collectionMount: string;
  songMount: string;
  snippet: string;
  matchType: FullTextSongSearchResultMatchType;
}

export interface UserCollectionInfo {
  collection: Collection;
  songIds: number[];
}

export interface GetUserCollectionsResponse {
  collectionInfos: UserCollectionInfo[];
}

export interface UpdateFavoriteSongKeyRequest {
  key: ChordTone;
}
