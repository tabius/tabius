import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, from, Observable, of} from 'rxjs';
import {Collection, CollectionDetails, Song, SongDetails} from '@common/catalog-model';
import {flatMap, map, shareReplay} from 'rxjs/operators';
import {TABIUS_CATALOG_BROWSER_STORE_TOKEN} from '@app/app-constants';
import {AddSongToSecondaryCollectionRequest, AddSongToSecondaryCollectionResponse, CreateListedCollectionRequest, CreateListedCollectionResponse, CreateUserCollectionRequest, CreateUserCollectionResponse, DeleteSongResponse, DeleteUserCollectionResponse, GetUserCollectionsResponse, RemoveSongFromSecondaryCollectionRequest, RemoveSongFromSecondaryCollectionResponse, UpdateSongRequest, UpdateSongResponse} from '@common/ajax-model';
import {combineLatest0, defined, isValidId, isValidUserId, mapToFirstInArray, waitForAllPromisesAndReturnFirstArg} from '@common/util/misc-utils';
import {ObservableStore, RefreshMode, skipUpdateCheck} from '@app/store/observable-store';
import {BrowserStateService} from '@app/services/browser-state.service';
import {checkUpdateByReference, checkUpdateByShallowArrayCompare, checkUpdateByVersion} from '@app/store';
import {I18N} from '@app/app-i18n';

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
  providedIn: 'root'
})
export class CatalogService {

  constructor(private readonly httpClient: HttpClient,
              private readonly bss: BrowserStateService,
              @Inject(TABIUS_CATALOG_BROWSER_STORE_TOKEN) private readonly store: ObservableStore) {
  }

  getListedCollections(): Observable<Collection[]> {
    return this.store.get<number[]>(
        COLLECTION_LIST_KEY,
        () => this.httpClient.get<Collection[]>('/api/collection/all-listed')
            .pipe(
                // Perform blocking update here for all collections first.
                // Reason: this caching prevents a lot of parallel getCollection() HTTP requests usually started immediately after the listing is received.
                flatMap(collections => waitForAllPromisesAndReturnFirstArg(collections, collections.map(a => this.updateCollectionOnFetch(a)))),
                map(collections => collections.map(a => a.id)),
            ),
        RefreshMode.RefreshOnce,
        checkUpdateByShallowArrayCompare,
    )
        //TODO: consider using 'getCollectionByIds' - unify undefined filtering with other places.
        .pipe(
            flatMap(ids => combineLatest0((ids || []).map(id => this.getCollectionById(id)))),
            map(items => (items.filter(defined) as Collection[])),
        );
  }

  getCollectionById(collectionId: number|undefined): Observable<Collection|undefined> {
    return this.store.get<Collection>(
        getCollectionKey(collectionId),
        () => this.httpClient.get<Collection[]>(`/api/collection/by-ids/${collectionId}`).pipe(mapToFirstInArray),
        RefreshMode.RefreshOnce,
        checkUpdateByVersion,
    );
  }

  getCollectionsByIds(collectionIds: readonly number[]): Observable<(Collection|undefined)[]> {
    return combineLatest0(collectionIds.map(id => this.getCollectionById(id)));
  }

  private updateCollectionOnFetch(collection: Collection|undefined): Promise<unknown> {
    if (!collection) {
      return Promise.resolve();
    }
    return Promise.all([
      this.store.set<Collection>(getCollectionKey(collection.id), collection, checkUpdateByVersion),
      this.store.set<number>(getCollectionIdByMountKey(collection.mount), collection.id, checkUpdateByReference)
    ]);
  }

  getCollectionDetails(collectionId: number|undefined): Observable<CollectionDetails|undefined> {
    return this.store.get<CollectionDetails>(
        getCollectionDetailsKey(collectionId),
        () => this.httpClient.get<CollectionDetails|undefined>(`/api/collection/details-by-id/${collectionId}`),
        RefreshMode.RefreshOnce,
        checkUpdateByVersion
    );
  }

  /** Returns list of all collection's song ids. The songs in the list are always sorted by id. */
  getSongIdsByCollection(collectionId: number|undefined): Observable<number[]|undefined> {
    return this.store.get<number[]>(
        getCollectionSongListKey(collectionId),
        () => this.httpClient.get<Song[]>(`/api/song/by-collection/${collectionId}`)
            .pipe(
                flatMap(songs => from(this.updateCollectionSongsOnFetch(collectionId!, songs, false)))
            ),
        RefreshMode.RefreshOnce,
        checkUpdateByShallowArrayCompare
    );
  }

  // TODO: cleanup songs that are not in the list anymore? Schedule GC by time?
  private async updateCollectionSongsOnFetch(collectionId: number, songs: Song[], updateCollectionSongList: boolean): Promise<number[]> {
    const songUpdatesArray$$ = songs.map(song => this.store.set<Song>(getSongKey(song.id), song, checkUpdateByVersion));
    const songIds = songs.map(s => s.id);

    // noinspection ES6MissingAwait
    const listingUpdate$$ = updateCollectionSongList
                            ? this.store.set<number[]>(getCollectionSongListKey(collectionId), songIds, checkUpdateByShallowArrayCompare)
                            : Promise.resolve();

    await Promise.all([
      ...songUpdatesArray$$,
      listingUpdate$$,
    ]);
    return songIds;
  }

  getCollectionIdByMount(collectionMount: string|undefined): Observable<number|undefined> {
    return this.store.get<number>(
        getCollectionIdByMountKey(collectionMount),
        () => this.httpClient.get<Collection|undefined>(`/api/collection/by-mount/${collectionMount}`)
            .pipe( // wait for update before continue.
                flatMap(a => waitForAllPromisesAndReturnFirstArg(a, [this.updateCollectionOnFetch(a)])),
                map(a => a && a.id)
            ),
        RefreshMode.RefreshOnce,
        checkUpdateByReference,
    );
  }

  getSongById(songId: number|undefined): Observable<Song|undefined> {
    return this.store.get<Song>(
        getSongKey(songId),
        () => this.httpClient.get<Song[]>(`/api/song/by-ids/${songId}`).pipe(mapToFirstInArray),
        RefreshMode.RefreshOnce,
        checkUpdateByVersion,
    );
  }

  getSongsByIds(songIds: readonly (number|undefined)[]): Observable<(Song|undefined)[]> {
    return combineLatest0(songIds.map(id => this.getSongById(id)));
  }

  getSongDetailsById(songId: number|undefined, refreshCachedVersion = true): Observable<SongDetails|undefined> {
    return this.store.get<SongDetails>(
        getSongDetailsKey(songId),
        () => this.httpClient.get<SongDetails[]>(`/api/song/details-by-ids/${songId}`).pipe(mapToFirstInArray),
        refreshCachedVersion ? RefreshMode.RefreshOnce : RefreshMode.DoNotRefresh,
        checkUpdateByVersion
    );
  }

  getSongByMount(collectionId: number|undefined, songMount: string|undefined): Observable<Song|undefined> {
    if (!isValidId(collectionId) || !songMount) {
      return of(undefined);
    }
    return this.getSongIdsByCollection(collectionId)
        .pipe(
            flatMap(songIds => songIds ? this.getSongsByIds(songIds) : of([])),
            map(songsIds => songsIds.find(s => s !== undefined && s.mount === songMount)),
        );
  }

  async createSong(song: Song, details: SongDetails): Promise<Song> {
    const request: UpdateSongRequest = {song, details};
    try {
      const response = await firstValueFrom(this.httpClient.post<UpdateSongResponse>('/api/song', request));
      await this.processSongUpdateResponse(response);
      return response.song;
    } catch (httpError) {
      console.error(httpError);
      throw new Error(I18N.common.serverRequestError);
    }
  }

  async updateSong(song: Song, details: SongDetails): Promise<void> {
    const request: UpdateSongRequest = {song, details};
    try {
      const response = await firstValueFrom(this.httpClient.put<UpdateSongResponse>('/api/song', request));
      await this.processSongUpdateResponse(response);
    } catch (httpError) {
      console.error(httpError);
      throw new Error(I18N.common.serverRequestError);
    }
  }

  private async processSongUpdateResponse(response: UpdateSongResponse): Promise<void> {
    await Promise.all([
      this.store.set<Song>(getSongKey(response.song.id), response.song, checkUpdateByVersion),
      this.store.set<SongDetails>(getSongDetailsKey(response.details.id), response.details, checkUpdateByVersion),
      this.updateCollectionSongsOnFetch(response.song.collectionId, response.songs, true),
    ]);
  }

  async deleteSong(songId: number|undefined): Promise<void> {
    if (!isValidId(songId)) {
      return;
    }
    const {updatedCollections} = await firstValueFrom(this.httpClient.delete<DeleteSongResponse>(`/api/song/${songId}`));
    await Promise.all([
      this.store.remove(getSongDetailsKey(songId)),
      this.store.remove(getSongDetailsKey(songId))
    ]);
    const collectionsUpdate$$ =
        updatedCollections.map(({collectionId, songs}) => this.updateCollectionSongsOnFetch(collectionId, songs, true));
    await Promise.all(collectionsUpdate$$);
  }

  async createListedCollection(createCollectionRequest: CreateListedCollectionRequest): Promise<Collection> {
    const response = await firstValueFrom(this.httpClient.post<CreateListedCollectionResponse>('/api/collection', createCollectionRequest));
    const collectionsUpdateArray$$ = response.collections
        .map(collection => this.store.set<Collection>(getCollectionKey(collection.id), collection, checkUpdateByVersion));
    const collectionIds = response.collections.map(collection => collection.id);
    const listingUpdate$$ = this.store.set(COLLECTION_LIST_KEY, collectionIds, checkUpdateByShallowArrayCompare);
    await Promise.all([
      ...collectionsUpdateArray$$,
      listingUpdate$$,
    ]);
    const collection = response.collections.find(collection => collection.id === response.collectionId);
    if (!collection) {
      throw new Error(I18N.common.failedToCreateCollection);
    }
    return collection;
  }

  async createUserCollection(userId: string, createCollectionRequest: CreateUserCollectionRequest): Promise<Collection> {
    const response = await firstValueFrom(this.httpClient.post<CreateUserCollectionResponse>('/api/collection/user', createCollectionRequest));
    await this.updateUserCollections(userId, response.collections);
    const collection = response.collections.find(collection => collection.id === response.collectionId);
    if (!collection) {
      throw new Error(I18N.common.failedToCreateCollection);
    }
    return collection;
  }

  async deleteUserCollection(collectionId: number|undefined): Promise<void> {
    if (!isValidId(collectionId)) {
      return;
    }
    const {userId, collections} = await firstValueFrom(this.httpClient.delete<DeleteUserCollectionResponse>(`/api/collection/user/${collectionId}`));
    // todo: personal songs were moved to the 'favorite'. Update it?
    await this.updateUserCollections(userId, collections);
  }

  private async updateUserCollections(userId: string, collections: Collection[]): Promise<void> {
    const userCollectionsKey = getUserCollectionsKey(userId);
    const collectionIdsInStore = await firstValueFrom(this.store.get<number[]>(userCollectionsKey, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    const collectionsRemoveArray$$: Promise<void>[] = [];
    for (const collectionId of (collectionIdsInStore || [])) {
      if (!collections.find(c => c.id === collectionId)) {
        collectionsRemoveArray$$.push(this.store.remove(getCollectionKey(collectionId)));
        collectionsRemoveArray$$.push(this.store.remove(getCollectionDetailsKey(collectionId)));
      }
    }

    const collectionIds = collections.map(c => c.id);
    const collectionsUpdateArray$$ = collections.map(collection =>
        this.store.set<Collection>(getCollectionKey(collection.id), collection, checkUpdateByVersion));
    await Promise.all([
      ...collectionsUpdateArray$$,
      ...collectionsRemoveArray$$,
      this.store.set(userCollectionsKey, collectionIds, checkUpdateByShallowArrayCompare),

    ]);
  }


  getUserCollections(userId?: string): Observable<Collection[]> {
    const collectionIds$ = this.getUserCollectionIds(userId);
    return collectionIds$.pipe(
        flatMap((ids) => this.getCollectionsByIds(ids)),
        map(collections => (collections.filter(defined) as Collection[])),
    );
  }

  getUserCollectionIds(userId?: string): Observable<number[]> {
    const userCollectionsListKey = getUserCollectionsKey(userId);
    if (!userCollectionsListKey || !userId) {
      return of([]);
    }
    return this.store.get<number[]>(
        userCollectionsListKey,
        () => this.httpClient.get<GetUserCollectionsResponse>(`/api/collection/user/${userId}`)
            .pipe(
                flatMap(response =>
                    waitForAllPromisesAndReturnFirstArg(response,
                        response.collectionInfos.map(info => this.updateCollectionOnFetch(info.collection)))),
                map((response) => response.collectionInfos.map(info => info.collection.id))
            ),
        RefreshMode.RefreshOnce,
        checkUpdateByShallowArrayCompare,
    ).pipe(map(collectionIds => !!collectionIds ? collectionIds : []));
  }

  async addSongToSecondaryCollection(songId: number, collectionId: number): Promise<void> {
    const request: AddSongToSecondaryCollectionRequest = {songId, collectionId};
    try {
      const {songIds} = await firstValueFrom(this.httpClient.put<AddSongToSecondaryCollectionResponse>(
          '/api/song/add-to-secondary-collection', request));
      await this.store.set<number[]>(getCollectionSongListKey(collectionId), songIds, checkUpdateByShallowArrayCompare);
    } catch (httpError) {
      console.error(httpError);
      throw new Error(I18N.common.serverRequestError);
    }
  }

  async removeSongFromSecondaryCollection(songId: number, collectionId: number): Promise<void> {
    const request: RemoveSongFromSecondaryCollectionRequest = {songId, collectionId};
    try {
      const {songIds} = await firstValueFrom(this.httpClient.put<RemoveSongFromSecondaryCollectionResponse>(
          '/api/song/remove-from-secondary-collection', request));
      await this.store.set<number[]>(getCollectionSongListKey(collectionId), songIds, checkUpdateByShallowArrayCompare);
    } catch (httpError) {
      console.error(httpError);
      throw new Error(I18N.common.serverRequestError);
    }
  }

  /**
   * Returns 1 random song from the given collection.
   * If collection id is not valid or not defined returns a song from the whole public catalog.
   */
  getRandomSongId(collectionId?: number): Observable<number|undefined> {
    const url = `/api/song/random-song-id/${isValidId(collectionId) ? collectionId : ''}`;
    return this.httpClient.get<number|undefined>(url)
        .pipe(shareReplay(1));
  }
}

function getCollectionKey(collectionId: number|undefined): string|undefined {
  return isValidId(collectionId) ? COLLECTION_KEY_PREFIX + collectionId : undefined;
}

function getCollectionDetailsKey(collectionId: number|undefined): string|undefined {
  return isValidId(collectionId) ? COLLECTION_DETAILS_KEY_PREFIX + collectionId : undefined;
}

function getCollectionIdByMountKey(collectionMount: string|undefined): string|undefined {
  return collectionMount && collectionMount.length > 0 ? COLLECTION_MOUNT_KEY_PREFIX + collectionMount : undefined;
}

function getCollectionSongListKey(collectionId: number|undefined): string|undefined {
  return isValidId(collectionId) ? COLLECTION_SONG_LIST_KEY_PREFIX + collectionId : undefined;
}

function getSongKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_KEY_PREFIX + songId : undefined;
}

function getSongDetailsKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_DETAILS_KEY_PREFIX + songId : undefined;
}

function getUserCollectionsKey(userId: string|undefined): string|undefined {
  return isValidUserId(userId) ? USER_COLLECTIONS_KEY + userId : undefined;
}

