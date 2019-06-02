import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest, Observable, of} from 'rxjs';
import {Artist, ArtistDetails, Song, SongDetails} from '@common/artist-model';
import {catchError, flatMap, map, take} from 'rxjs/operators';
import {isPlatformBrowser} from '@angular/common';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN} from '@common/constants';
import {fromPromise} from 'rxjs/internal-compatibility';
import {ArtistDetailsResponse} from '@common/ajax-model';
import {isInvalidId, needUpdateByShallowArrayCompare, needUpdateByVersionChange} from '@common/util/misc_utils';
import {WithId} from '@common/common-model';
import {BrowserStore} from '@app/store/browser-store';

const ARTIST_LIST_KEY = 'artist-list';
const ARTIST_KEY_PREFIX = 'artist-';
const ARTIST_DETAILS_KEY_PREFIX = 'artist-d-';
const SONG_KEY_PREFIX = 'song-';
const SONG_DETAIL_KEY_PREFIX = 'song-d-';

@Injectable({
  providedIn: 'root'
})
export class ArtistDataService {

  /** Keys of all artists/songs/lists the query is running now.*/
  private runningQueries = new Set<string>();

  private readonly browser: boolean;

  constructor(private readonly httpClient: HttpClient,
              @Inject(TABIUS_ARTISTS_BROWSER_STORE_TOKEN) private readonly store: BrowserStore,
              @Inject(PLATFORM_ID) platformId: string) {
    this.browser = isPlatformBrowser(platformId);
  }

  /** Returns true if this key was not fetched before using this data service instance (during the app session). */
  private needUpdate(key: string): boolean {
    return !this.runningQueries.has(key) && !this.store.isUpdated(key);
  }

  getAllArtists(): Observable<Artist[]> {
    if (this.needUpdate(ARTIST_LIST_KEY)) {
      this.fetchArtistsList();
    }
    return this.store.get<number[]>(ARTIST_LIST_KEY).pipe(
        flatMap(ids => this.getArtistsByIds(ids || [])),
        map(items => (items.filter(i => i !== undefined) as Artist[])),
    );
  }

  private async fetchArtistsList(): Promise<void> {
    this.runningQueries.add(ARTIST_LIST_KEY);
    return this.httpClient.get('/api/artist/all', {observe: 'response'}).pipe(
        take(1),
        catchError(response => of({...response, body: undefined})),
        map(response => {
              this.runningQueries.delete(ARTIST_LIST_KEY);
              if (response.ok) {
                const artists: Artist[] = response.body;
                const storePromises: Promise<void>[] = artists.map(artist => this.registerArtistOnFetch(artist));
                Promise.all(storePromises).then(() => {
                  this.store.set(ARTIST_LIST_KEY, artists.map(artist => artist.id), needUpdateByShallowArrayCompare);
                });
              }
            }
        )
    ).toPromise();
  }

  private registerArtistOnFetch(artist: Artist): Promise<void> {
    return this.store.set(getArtistKey(artist.id), artist, needUpdateByVersionChange);
  }

  getArtistDetails(artistId: number|undefined): Observable<ArtistDetails|undefined> {
    if (artistId === undefined || artistId <= 0) {
      return of(undefined);
    }
    const artistKey = getArtistDetailsKey(artistId);
    if (this.needUpdate(artistKey)) {
      this.fetchArtistDetails(artistId);
    }
    return this.store.get<ArtistDetails>(artistKey);
  }

  private async fetchArtists(artistIds: number[]): Promise<void> {
    if (artistIds.length === 0) {
      return;
    }
    const artistKeys = artistIds.map(id => getArtistKey(id));
    artistKeys.forEach(key => this.runningQueries.add(key));
    return this.httpClient.get(`/api/artist/by-ids/${artistIds.join(',')}`, {observe: 'response'}).pipe(
        take(1),
        catchError(response => of({...response, body: undefined})),
        map(response => {
              artistKeys.forEach(key => this.runningQueries.delete(key));
              if (response.ok) {
                const artists: Artist[] = response.body;
                artists.forEach(artist => this.registerArtistOnFetch(artist));
              }
            }
        )
    ).toPromise();
  }

  private async fetchArtistDetails(artistId: number): Promise<void> {
    const artistDetailsKey = getArtistDetailsKey(artistId);
    this.runningQueries.add(artistDetailsKey);
    return this.httpClient.get(`/api/artist/details-by-id/${artistId}`, {observe: 'response'}).pipe(
        take(1),
        catchError(response => of({...response, body: undefined})),
        map(response => {
          this.runningQueries.delete(artistDetailsKey);
          if (response.ok) {
            const {artist, songs} = response.body as ArtistDetailsResponse;
            this.registerArtistOnFetch(artist);
            const details: ArtistDetails = {id: artist.id, songIds: songs.map(s => s.id), version: artist.version};
            this.store.set(artistDetailsKey, details, needUpdateByVersionChange);
            songs.forEach(s => this.store.set(getSongKey(s.id), s, needUpdateByVersionChange));
            if (this.browser) { // todo: find a better place for all-songs pre-fetch?
              this.fetchAndCacheMissedSongDetails(songs.map(s => s.id)); // pre-fetch all songs
            }
          }
        })
    ).toPromise();
  }

  getSongsByArtistId(artistId?: number): Observable<Song[]> {
    if (isInvalidId(artistId)) {
      return of([]);
    }
    return this.getArtistDetails(artistId).pipe(
        flatMap(details => details === undefined ? of([]) : this.getSongsByIds(details.songIds)),
        // tap(songs => console.log('Songs', songs)),
        map(songs => songs.filter(s => s !== undefined) as Song[])
    );
  }

  getArtistById(artistId?: number): Observable<(Artist|undefined)> {
    if (isInvalidId(artistId)) {
      return of(undefined);
    }
    return this.getArtistsByIds([artistId!]).pipe(map(list => list[0]));
  }

  getArtistsByIds(artistIds: number[]): Observable<(Artist|undefined)[]> {
    return fromPromise(this.fetchAndCacheMissedArtists(artistIds))
        .pipe(
            take(1),
            flatMap(() => {
              const artistArray$ = artistIds.map(id => this.store.get<Artist>(getArtistKey(id)));
              return artistArray$.length === 0 ? of([]) : combineLatest(artistArray$);
            }),
        );
  }

  /** Pre-fetches all song list items missed in cache. */
  private async fetchAndCacheMissedArtists(artistIds: number[]): Promise<void> {
    const missedArtistIds = await this.getMissedIds(ARTIST_KEY_PREFIX, artistIds);
    return this.fetchArtists(missedArtistIds);
  }

  getArtistByMount(artistMount: string): Observable<Artist|undefined> {
    return this.getAllArtists().pipe(
        map(artists => artists.find(a => a.mount === artistMount)),
    );
  }

  getSongById(songId?: number): Observable<(Song|undefined)> {
    if (isInvalidId(songId)) {
      return of(undefined);
    }
    return this.getSongsByIds([songId]).pipe(map(list => list[0]));
  }

  getSongsByIds(songIds: number[]): Observable<(Song|undefined)[]> {
    return fromPromise(this.fetchAndCacheMissedSongs(songIds))
        .pipe(
            take(1),
            flatMap(() => {
              const songArray$ = songIds.map(id => this.store.get<Song>(getSongKey(id)));
              return songArray$.length === 0 ? of([]) : combineLatest(songArray$);
            }));
  }

  getSongDetailsById(songId: number|undefined): Observable<SongDetails|undefined> {
    if (isInvalidId(songId)) {
      return of(undefined);
    }
    const songDetailsKey = getSongDetailsKey(songId);
    if (this.needUpdate(songDetailsKey)) {
      this.fetchAndCacheMissedSongDetails([songId]);
    }
    return this.store.get<SongDetails>(songDetailsKey);
  }

  /** Pre-fetches all song list items missed in cache. */
  private async fetchAndCacheMissedSongs(songIds: number[]): Promise<void> {
    const missedSongIds = await this.getMissedIds(SONG_KEY_PREFIX, songIds);
    return this.fetchSongs(missedSongIds);
  }

  /** Pre-fetches all song list items missed in cache. */
  private async fetchAndCacheMissedSongDetails(songIds: number[]): Promise<void> {
    const missedSongIds = await this.getMissedIds(SONG_DETAIL_KEY_PREFIX, songIds);
    return this.fetchSongsDetails(missedSongIds);
  }

  private async fetchSongs(songIds: number[]): Promise<void> {
    if (songIds.length === 0) {
      return;
    }
    const songKeys = songIds.map(id => getSongKey(id));
    songKeys.forEach(key => this.runningQueries.add(key));
    return this.httpClient
        .get(`/api/song/by-ids/${songIds}`, {observe: 'response'})
        .pipe(
            catchError(response => of({...response, body: undefined})),
            take(1),
            map(response => {
              songKeys.forEach(key => this.runningQueries.delete(key));
              if (response.ok) {
                const songs = response.body as Song[];
                songs.forEach(song => this.store.set(getSongKey(song.id), song, needUpdateByVersionChange));
              }
            }))
        .toPromise();
  }

  private async fetchSongsDetails(songIds: number[]): Promise<void> {
    if (songIds.length === 0) {
      return;
    }
    const songDetailsKeys = songIds.map(id => getSongDetailsKey(id));
    songDetailsKeys.forEach(key => this.runningQueries.add(key));
    return this.httpClient
        .get(`/api/song/details-by-ids/${songIds}`, {observe: 'response'})
        .pipe(
            catchError(response => of({...response, body: undefined})),
            take(1),
            map(response => {
              songDetailsKeys.forEach(key => this.runningQueries.delete(key));
              if (response.ok) {
                const detailsList = response.body as SongDetails[];
                for (const details of detailsList) {
                  this.store.set(getSongDetailsKey(details.id), details, needUpdateByVersionChange);
                }
              }
            }))
        .toPromise();
  }

  getSongByMount(artistMount: string, songMount: string): Observable<Song|undefined> {
    return this.getArtistByMount(artistMount).pipe(
        flatMap(artist => this.getSongsByArtistId(artist ? artist.id : undefined)),
        map(songs => songs.find(s => s.mount === songMount)),
    );
  }


  private async getMissedIds(keyPrefix: string, ids: number[]): Promise<number[]> {
    if (ids.length === 0) {
      return [];
    }
    type EntityFlag = { id: number, found: boolean };
    const arrayOfFlags$: Observable<EntityFlag>[] = ids.map(
        id => combineLatest([of(id), this.store.get<WithId>(keyPrefix + id)])
            .pipe(map(([id, withId]) => ({id, found: withId !== undefined})))
    );

    const latestFlags$ = arrayOfFlags$.length === 0 ? of([]) : combineLatest(arrayOfFlags$);
    const arrayOfPairs: EntityFlag[] = await latestFlags$.pipe(take(1)).toPromise();
    return arrayOfPairs.filter(p => !p.found).map(p => p.id);
  }
}

function getArtistDetailsKey(artistId: number): string {
  return ARTIST_DETAILS_KEY_PREFIX + artistId;
}

function getArtistKey(artistId: number): string {
  return ARTIST_KEY_PREFIX + artistId;
}

function getSongKey(songId: number): string {
  return SONG_KEY_PREFIX + songId;
}

function getSongDetailsKey(songId: number): string {
  return SONG_DETAIL_KEY_PREFIX + songId;
}
