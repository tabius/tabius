import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, from, Observable, of } from 'rxjs';
import { Collection, CollectionDetails, Song, SongDetails } from '@common/catalog-model';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { TABIUS_CATALOG_BROWSER_STORE_TOKEN } from '@app/app-constants';
import {
  AddSongToSecondaryCollectionRequest,
  AddSongToSecondaryCollectionResponse,
  CreateListedCollectionRequest,
  CreateListedCollectionResponse,
  CreateUserCollectionRequest,
  CreateUserCollectionResponse,
  DeleteSongResponse,
  DeleteUserCollectionResponse,
  GetUserCollectionsResponse,
  MoveSongToAnotherCollectionRequest,
  MoveSongToAnotherCollectionResponse,
  RemoveSongFromSecondaryCollectionRequest,
  RemoveSongFromSecondaryCollectionResponse,
  UpdateSongRequest,
  UpdateSongResponse,
  UpdateSongSceneFlagRequest,
} from '@common/api-model';
import {
  combineLatest0,
  isDefined,
  isNumericId,
  isUserId,
  mapToFirstInArray,
  waitForAllPromisesAndReturnFirstArg,
} from '@common/util/misc-utils';
import { ObservableStore, RefreshMode, skipUpdateCheck } from '@app/store/observable-store';
import { checkUpdateByReference, checkUpdateByShallowArrayCompare, checkUpdateByVersion } from '@app/store';
import { I18N } from '@app/app-i18n';
import { getMessageFromError } from 'assertic';

const COLLECTION_LIST_KEY = 'catalog';
const COLLECTION_KEY_PREFIX = 'c-';
const COLLECTION_DETAILS_KEY_PREFIX = 'c-details-';
const COLLECTION_MOUNT_KEY_PREFIX = 'c-mount-';
const COLLECTION_SONG_LIST_KEY_PREFIX = 'c-songs-';
const SONG_KEY_PREFIX = 's-';
const SONG_DETAILS_KEY_PREFIX = 's-details-';
const USER_COLLECTIONS_KEY = 'u-collections-';

/** Client-side API to access/update catalog: collections and songs. */
@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly httpClient = inject(HttpClient);
  private readonly store = inject<ObservableStore>(TABIUS_CATALOG_BROWSER_STORE_TOKEN);


  getListedCollections(): Observable<Collection[]> {
    return (
      this.store
        .get<number[]>(
          COLLECTION_LIST_KEY,
          () =>
            this.httpClient.get<Collection[]>('/api/collection/all-listed').pipe(
              // Perform blocking update here for all collections first.
              // Reason: this caching prevents a lot of parallel getCollection() HTTP requests usually started immediately after the listing is received.
              switchMap(collections =>
                waitForAllPromisesAndReturnFirstArg(
                  collections,
                  collections.map(a => this.updateCollectionOnFetch(a)),
                ),
              ),
              map(collections => collections.map(a => a.id)),
            ),
          RefreshMode.RefreshOnce,
          checkUpdateByShallowArrayCompare,
        )
        //TODO: consider using 'getCollectionByIds' - unify undefined filtering with other places.
        .pipe(
          switchMap(ids => combineLatest0((ids || []).map(id => this.observeCollection(id)))),
          map(items => items.filter(isDefined) as Collection[]),
        )
    );
  }

  observeCollection(collectionId: number | undefined): Observable<Collection | undefined> {
    return this.store.get<Collection>(
      getCollectionKey(collectionId),
      () => this.httpClient.get<Collection[]>(`/api/collection/by-ids/${collectionId}`).pipe(mapToFirstInArray),
      RefreshMode.RefreshOnce,
      checkUpdateByVersion,
    );
  }

  getCollectionsByIds(collectionIds: readonly number[]): Observable<(Collection | undefined)[]> {
    return combineLatest0(collectionIds.map(id => this.observeCollection(id)));
  }

  private updateCollectionOnFetch(collection: Collection | undefined): Promise<unknown> {
    if (!collection) {
      return Promise.resolve();
    }
    return Promise.all([
      this.store.set<Collection>(getCollectionKey(collection.id), collection, checkUpdateByVersion),
      this.store.set<number>(getCollectionIdByMountKey(collection.mount), collection.id, checkUpdateByReference),
    ]);
  }

  getCollectionDetails(collectionId: number | undefined): Observable<CollectionDetails | undefined> {
    return this.store.get<CollectionDetails>(
      getCollectionDetailsKey(collectionId),
      () => this.httpClient.get<CollectionDetails | undefined>(`/api/collection/details-by-id/${collectionId}`),
      RefreshMode.RefreshOnce,
      checkUpdateByVersion,
    );
  }

  /** Returns list of all collection's song ids. The songs in the list are always sorted by id. */
  getSongIdsByCollection(collectionId: number | undefined): Observable<number[] | undefined> {
    if (!collectionId) {
      return of(undefined);
    }
    return this.store.get<number[]>(
      getCollectionSongListKey(collectionId),
      () =>
        this.httpClient
          .get<Song[]>(`/api/song/by-collection/${collectionId}`)
          .pipe(switchMap(songs => from(this.updateCollectionSongsOnFetch(collectionId, songs, false)))),
      RefreshMode.RefreshOnce,
      checkUpdateByShallowArrayCompare,
    );
  }

  // TODO: cleanup songs that are not in the list anymore? Schedule GC by time?
  private async updateCollectionSongsOnFetch(
    collectionId: number,
    songs: Song[],
    updateCollectionSongList: boolean,
  ): Promise<number[]> {
    const songUpdatesArray$$ = songs.map(song => this.store.set<Song>(getSongKey(song.id), song, checkUpdateByVersion));
    const songIds = songs.map(s => s.id);

    // noinspection ES6MissingAwait
    const listingUpdate$$ = updateCollectionSongList
      ? this.store.set<number[]>(getCollectionSongListKey(collectionId), songIds, checkUpdateByShallowArrayCompare)
      : Promise.resolve();

    await Promise.all([...songUpdatesArray$$, listingUpdate$$]);
    return songIds;
  }

  getCollectionIdByMount(collectionMount: string | undefined): Observable<number | undefined> {
    return this.store.get<number>(
      getCollectionIdByMountKey(collectionMount),
      () =>
        this.httpClient.get<Collection | undefined>(`/api/collection/by-mount/${collectionMount}`).pipe(
          // wait for update before continue.
          switchMap(a => waitForAllPromisesAndReturnFirstArg(a, [this.updateCollectionOnFetch(a)])),
          map(a => a && a.id),
        ),
      RefreshMode.RefreshOnce,
      checkUpdateByReference,
    );
  }

  observeSong(songId: number | undefined): Observable<Song | undefined> {
    return this.store.get<Song>(
      getSongKey(songId),
      () => this.httpClient.get<Song[]>(`/api/song/by-ids/${songId}`).pipe(mapToFirstInArray),
      RefreshMode.RefreshOnce,
      checkUpdateByVersion,
    );
  }

  getSongsByIds(songIds: readonly (number | undefined)[]): Observable<(Song | undefined)[]> {
    return combineLatest0(songIds.map(id => this.observeSong(id)));
  }

  getSongDetailsById$$(songId: number | undefined): Promise<SongDetails | undefined> {
    return firstValueFrom(this.getSongDetailsById(songId));
  }

  getSongDetailsById(songId: number | undefined, refreshCachedVersion = true): Observable<SongDetails | undefined> {
    return this.store.get<SongDetails>(
      getSongDetailsKey(songId),
      () =>
        this.httpClient.get<Array<SongDetails>>(`/api/song/details-by-ids/${songId}`).pipe(
          mapToFirstInArray,
          tap(song => {
            if (song) {
              // Replace tab characters in the song text with spaces. This code can be removed after DB cleanup.
              song.content = song.content.replace(/\t/g, '    ');
            }
          }),
        ),
      refreshCachedVersion ? RefreshMode.RefreshOnce : RefreshMode.DoNotRefresh,
      checkUpdateByVersion,
    );
  }

  getSongByMount(
    collectionId: number | undefined,
    primaryCollectionId: number | undefined,
    songMount: string,
  ): Observable<Song | undefined> {
    if (!isNumericId(collectionId) || !songMount) {
      return of(undefined);
    }
    return this.getSongIdsByCollection(collectionId).pipe(
      switchMap(songIds => (songIds ? this.getSongsByIds(songIds) : of([]))),
      map(songsIds =>
        songsIds.find(s => s?.mount === songMount && (!isNumericId(primaryCollectionId) || s.collectionId === primaryCollectionId)),
      ),
    );
  }

  async createSong(song: Song, details: SongDetails): Promise<Song> {
    const request: UpdateSongRequest = { song, details };
    try {
      const response = await firstValueFrom(this.httpClient.post<UpdateSongResponse>('/api/song', request));
      await this.processSongUpdateResponse(response);
      return response.song;
    } catch (httpError) {
      console.error(httpError);
      throw new Error(`${I18N.common.serverRequestError}: ${getMessageFromError(httpError)}`);
    }
  }

  async updateSong(song: Song, details: SongDetails): Promise<void> {
    const request: UpdateSongRequest = { song, details };
    try {
      const response = await firstValueFrom(this.httpClient.put<UpdateSongResponse>('/api/song', request));
      await this.processSongUpdateResponse(response);
    } catch (httpError) {
      console.error(httpError);
      throw new Error(`${I18N.common.serverRequestError}: ${getMessageFromError(httpError)}`);
    }
  }

  async toggleSongSceneFlag(songId: number, flag: boolean): Promise<void> {
    const request: UpdateSongSceneFlagRequest = { songId, flag };
    try {
      const response = await firstValueFrom(this.httpClient.put<UpdateSongResponse>('/api/song/scene', request));
      await this.processSongUpdateResponse(response);
    } catch (httpError: unknown) {
      console.error(httpError);
      throw new Error(`${I18N.common.serverRequestError}: ${getMessageFromError(httpError)}`);
    }
  }

  private async processSongUpdateResponse(response: UpdateSongResponse): Promise<void> {
    await Promise.all([
      this.store.set<Song>(getSongKey(response.song.id), response.song, checkUpdateByVersion),
      this.store.set<SongDetails>(getSongDetailsKey(response.details.id), response.details, checkUpdateByVersion),
      response.songs ? this.updateCollectionSongsOnFetch(response.song.collectionId, response.songs, true) : Promise.resolve(),
    ]);
  }

  async deleteSong(songId: number, collectionId: number): Promise<void> {
    const { updatedCollections } = await firstValueFrom(
      this.httpClient.delete<DeleteSongResponse>(`/api/song/${songId}/${collectionId}`),
    );
    await Promise.all([this.store.remove(getSongKey(songId)), this.store.remove(getSongDetailsKey(songId))]);
    const collectionsUpdate$$ = updatedCollections.map(({ collectionId, songs }) =>
      this.updateCollectionSongsOnFetch(collectionId, songs, true),
    );
    await Promise.all(collectionsUpdate$$);
  }

  async createListedCollection(createCollectionRequest: CreateListedCollectionRequest): Promise<Collection> {
    const response = await firstValueFrom(
      this.httpClient.post<CreateListedCollectionResponse>('/api/collection', createCollectionRequest),
    );
    const collectionsUpdateArray$$ = response.collections.map(collection =>
      this.store.set<Collection>(getCollectionKey(collection.id), collection, checkUpdateByVersion),
    );
    const collectionIds = response.collections.map(collection => collection.id);
    const listingUpdate$$ = this.store.set(COLLECTION_LIST_KEY, collectionIds, checkUpdateByShallowArrayCompare);
    await Promise.all([...collectionsUpdateArray$$, listingUpdate$$]);
    const collection = response.collections.find(collection => collection.id === response.collectionId);
    if (!collection) {
      throw new Error(I18N.common.failedToCreateCollection);
    }
    return collection;
  }

  async createUserCollection(userId: string, createCollectionRequest: CreateUserCollectionRequest): Promise<Collection> {
    const response = await firstValueFrom(
      this.httpClient.post<CreateUserCollectionResponse>('/api/collection/user', createCollectionRequest),
    );
    await this.updateUserCollections(userId, response.collections);
    const collection = response.collections.find(collection => collection.id === response.collectionId);
    if (!collection) {
      throw new Error(I18N.common.failedToCreateCollection);
    }
    return collection;
  }

  async deleteUserCollection(collectionId: number | undefined): Promise<void> {
    if (!isNumericId(collectionId)) {
      return;
    }
    const { userId, collections } = await firstValueFrom(
      this.httpClient.delete<DeleteUserCollectionResponse>(`/api/collection/user/${collectionId}`),
    );
    // todo: personal songs were moved to the 'favorite'. Update it?
    await this.updateUserCollections(userId, collections);
  }

  private async updateUserCollections(userId: string, collections: Collection[]): Promise<void> {
    const userCollectionsKey = getUserCollectionsKey(userId);
    const collectionIdsInStore = await firstValueFrom(
      this.store.get<number[]>(userCollectionsKey, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck),
    );
    const collectionsRemoveArray$$: Promise<void>[] = [];
    for (const collectionId of collectionIdsInStore || []) {
      if (!collections.find(c => c.id === collectionId)) {
        collectionsRemoveArray$$.push(this.store.remove(getCollectionKey(collectionId)));
        collectionsRemoveArray$$.push(this.store.remove(getCollectionDetailsKey(collectionId)));
      }
    }

    const collectionIds = collections.map(c => c.id);
    const collectionsUpdateArray$$ = collections.map(collection =>
      this.store.set<Collection>(getCollectionKey(collection.id), collection, checkUpdateByVersion),
    );
    await Promise.all([
      ...collectionsUpdateArray$$,
      ...collectionsRemoveArray$$,
      this.store.set(userCollectionsKey, collectionIds, checkUpdateByShallowArrayCompare),
    ]);
  }

  getUserCollections(userId: string | undefined): Observable<Collection[]> {
    const collectionIds$ = this.getUserCollectionIds(userId);
    return collectionIds$.pipe(
      switchMap(ids => this.getCollectionsByIds(ids)),
      map(collections => collections.filter(isDefined) as Collection[]),
    );
  }

  getUserCollectionIds(userId: string | undefined): Observable<number[]> {
    const userCollectionsListKey = getUserCollectionsKey(userId);
    if (!userCollectionsListKey || !userId) {
      return of([]);
    }
    return this.store
      .get<number[]>(
        userCollectionsListKey,
        () =>
          this.httpClient.get<GetUserCollectionsResponse>(`/api/collection/user/${userId}`).pipe(
            switchMap(response =>
              waitForAllPromisesAndReturnFirstArg(
                response,
                response.collectionInfos.map(info => this.updateCollectionOnFetch(info.collection)),
              ),
            ),
            map(response => response.collectionInfos.map(info => info.collection.id)),
          ),
        RefreshMode.RefreshOnce,
        checkUpdateByShallowArrayCompare,
      )
      .pipe(map(collectionIds => (!!collectionIds ? collectionIds : [])));
  }

  async addSongToSecondaryCollection(songId: number, collectionId: number): Promise<void> {
    const request: AddSongToSecondaryCollectionRequest = { songId, collectionId };
    try {
      const { songIds } = await firstValueFrom(
        this.httpClient.put<AddSongToSecondaryCollectionResponse>('/api/song/add-to-secondary-collection', request),
      );
      await this.store.set<number[]>(getCollectionSongListKey(collectionId), songIds, checkUpdateByShallowArrayCompare);
    } catch (httpError) {
      console.error(httpError);
      throw new Error(`${I18N.common.serverRequestError}: ${getMessageFromError(httpError)}`);
    }
  }

  async removeSongFromSecondaryCollection(songId: number, collectionId: number): Promise<void> {
    const request: RemoveSongFromSecondaryCollectionRequest = { songId, collectionId };
    try {
      const { songIds } = await firstValueFrom(
        this.httpClient.put<RemoveSongFromSecondaryCollectionResponse>('/api/song/remove-from-secondary-collection', request),
      );
      await this.store.set<number[]>(getCollectionSongListKey(collectionId), songIds, checkUpdateByShallowArrayCompare);
    } catch (httpError) {
      console.error(httpError);
      throw new Error(`${I18N.common.serverRequestError}: ${getMessageFromError(httpError)}`);
    }
  }

  /**
   * Returns 1 random song from the given collection.
   * If collection id is not valid or not defined returns a song from the whole public catalog.
   */
  getRandomSongId(collectionId?: number): Observable<number | undefined> {
    const url = `/api/song/random-song-id/${isNumericId(collectionId) ? collectionId : ''}`;
    return this.httpClient.get<number | undefined>(url).pipe(shareReplay(1));
  }

  /** Returns 1 song to be shown on the scene for today. */
  getSceneSongId(collectionId?: number): Observable<number> {
    const url = `/api/song/scene-song-id/${isNumericId(collectionId) ? collectionId : ''}`;
    // TODO: cache for some period? up to 1 day.
    return this.httpClient.get<number>(url).pipe(shareReplay(1));
  }

  async moveSongToAnotherCollection(songId: number, sourceCollectionId: number, targetCollectionId: number): Promise<void> {
    const request: MoveSongToAnotherCollectionRequest = { songId, sourceCollectionId, targetCollectionId };
    try {
      const { song, sourceCollectionSongIds, targetCollectionSongIds } = await firstValueFrom(
        this.httpClient.put<MoveSongToAnotherCollectionResponse>('/api/song/move-to-another-collection', request),
      );
      // console.log('Set collection songs: ' + sourceCollectionId, sourceCollectionSongIds);
      // console.log('Set collection songs: ' + targetCollectionId, targetCollectionSongIds);
      await this.store.set<Song>(getSongKey(song.id), song, skipUpdateCheck);
      await this.store.set<number[]>(
        getCollectionSongListKey(targetCollectionId),
        targetCollectionSongIds,
        checkUpdateByShallowArrayCompare,
      );
      await this.store.set<number[]>(
        getCollectionSongListKey(sourceCollectionId),
        sourceCollectionSongIds,
        checkUpdateByShallowArrayCompare,
      );
    } catch (httpError) {
      console.error(httpError);
      throw new Error(`${I18N.common.serverRequestError}: ${getMessageFromError(httpError)}`);
    }
  }
}

function getCollectionKey(collectionId: number | undefined): string | undefined {
  return isNumericId(collectionId) ? COLLECTION_KEY_PREFIX + collectionId : undefined;
}

function getCollectionDetailsKey(collectionId: number | undefined): string | undefined {
  return isNumericId(collectionId) ? COLLECTION_DETAILS_KEY_PREFIX + collectionId : undefined;
}

function getCollectionIdByMountKey(collectionMount: string | undefined): string | undefined {
  return collectionMount && collectionMount.length > 0 ? COLLECTION_MOUNT_KEY_PREFIX + collectionMount : undefined;
}

function getCollectionSongListKey(collectionId: number | undefined): string | undefined {
  return isNumericId(collectionId) ? COLLECTION_SONG_LIST_KEY_PREFIX + collectionId : undefined;
}

function getSongKey(songId: number | undefined): string | undefined {
  return isNumericId(songId) ? SONG_KEY_PREFIX + songId : undefined;
}

function getSongDetailsKey(songId: number | undefined): string | undefined {
  return isNumericId(songId) ? SONG_DETAILS_KEY_PREFIX + songId : undefined;
}

function getUserCollectionsKey(userId: string | undefined): string | undefined {
  return isUserId(userId) ? USER_COLLECTIONS_KEY + userId : undefined;
}
