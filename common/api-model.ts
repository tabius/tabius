import { User, UserSettings } from '@common/user-model';
import { Collection, CollectionType, Song, SongDetails } from '@common/catalog-model';
import { ChordTone } from '@common/util/chords-lib';

export interface LoginResponse {
  readonly user: User | undefined;
  readonly settings: UserSettings;
}

export interface CreateListedCollectionRequest {
  name: string;
  mount: string;
  type: CollectionType;
}

export interface CreateListedCollectionResponse {
  /** ID of the created collection. */
  collectionId: number;
  /** List of all listed collections. */
  collections: Collection[];
}

export interface CreateUserCollectionRequest {
  name: string;
}

export interface CreateUserCollectionResponse {
  /** ID of the created collection. */
  collectionId: number;
  /** List of all user collections. */
  collections: Collection[];
}

export interface UpdateCollectionRequest {
  id: number;
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

export type FullTextSongSearchResultMatchType = 'title' | 'content';

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

// === Broken YouTube link review queue (youtube_link_fix) ===

export type YoutubeLinkFixStatus = 'needs_review' | 'approved' | 'rejected' | 'no_match' | 'dismissed';

export type YoutubeCandidateChannelKind = 'topic' | 'vevo' | 'artist' | 'other';

/** A YouTube search result proposed as a replacement for a broken video. */
export interface YoutubeCandidate {
  videoId: string;
  title: string;
  channel: string;
  channelKind: YoutubeCandidateChannelKind;
  /** 0..1: title similarity x channel trust. */
  score: number;
}

/** One review-queue item: a song that references a broken video, with proposed replacements. */
export interface YoutubeLinkFixItem {
  id: number;
  songId: number;
  songTitle: string;
  collectionName: string;
  collectionMount: string;
  songMount: string;
  oldVideoId: string;
  status: YoutubeLinkFixStatus;
  bestScore: number | null;
  candidates: YoutubeCandidate[];
  searchCount: number;
  /** ISO timestamp of the last search, or null. */
  lastSearchAt: string | null;
  /** First lines of the song text (with chords), for comparing against the video without leaving the page. */
  songText: string;
}

export interface GetYoutubeLinkFixQueueResponse {
  items: YoutubeLinkFixItem[];
}

/** `videoId` may be a bare video id or a full YouTube URL (the backend extracts the id). */
export interface ApproveYoutubeLinkFixRequest {
  id: number;
  videoId: string;
}

export interface YoutubeLinkFixIdRequest {
  id: number;
}

export interface YoutubeLinkFixActionResponse {
  id: number;
  status: YoutubeLinkFixStatus;
}
