import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest, Observable, of} from 'rxjs';
import {Artist, ArtistDetails, Song, SongDetails} from '@common/artist-model';
import {flatMap, map, take} from 'rxjs/operators';
import {isPlatformBrowser} from '@angular/common';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN} from '@common/constants';
import {fromPromise} from 'rxjs/internal-compatibility';
import {ArtistDetailsResponse} from '@common/ajax-model';
import {defined, isInvalidId, needUpdateByShallowArrayCompare, needUpdateByVersionChange, runWithDedup} from '@common/util/misc-utils';
import {WithNumId} from '@common/common-model';
import {BrowserStore} from '@app/store/browser-store';
import {BrowserStateService} from '@app/services/browser-state.service';

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
  private readonly runningQueries = new Set<string>();

  private readonly browser: boolean;

  constructor(private readonly httpClient: HttpClient,
              private readonly bss: BrowserStateService,
              @Inject(TABIUS_ARTISTS_BROWSER_STORE_TOKEN) private readonly store: BrowserStore,
              @Inject(PLATFORM_ID) platformId: string) {
    this.browser = isPlatformBrowser(platformId);
  }

  getAllArtists(): Observable<Artist[]> {
    this.fetchArtistsListIfNeeded().catch(err => console.warn(err));
    return this.store.get<number[]>(ARTIST_LIST_KEY)
        .pipe(
            flatMap(ids => this.getArtistsByIds(ids || [])),
            map(items => (items.filter(defined) as Artist[])),
        );
  }

  private async fetchArtistsListIfNeeded(): Promise<void> {
    if (this.bss.isOnline() && !this.store.isUpdated(ARTIST_LIST_KEY)) {
      await runWithDedup(ARTIST_LIST_KEY, this.runningQueries, async () => {
        const artists = await this.httpClient.get<Artist[]>('/api/artist/all').toPromise();
        await Promise.all(artists.map(artist => this.registerArtistOnFetch(artist)));
        await this.store.set(ARTIST_LIST_KEY, artists.map(artist => artist.id), needUpdateByShallowArrayCompare);
      });
    }
  }

  private async registerArtistOnFetch(artist: Artist): Promise<void> {
    const artistKey = getArtistKey(artist.id);
    return this.store.set(artistKey, artist, needUpdateByVersionChange);
  }

  getArtistDetails(artistId: number|undefined): Observable<ArtistDetails|undefined> {
    if (isInvalidId(artistId)) {
      return of(undefined);
    }
    this.fetchArtistDetailsIfNeeded(artistId).catch(err => console.warn(err));
    const artistKey = getArtistDetailsKey(artistId);
    return this.store.get<ArtistDetails>(artistKey);
  }

  private async fetchArtists(artistIds: readonly number[]): Promise<void> {
    if (artistIds.length === 0) {
      return;
    }
    const artistKeys = artistIds.map(id => getArtistKey(id));
    artistKeys.forEach(key => this.runningQueries.add(key));
    try {
      const idsParam = artistIds.join(',');
      const artists = await this.httpClient.get<Artist[]>(`/api/artist/by-ids/${idsParam}`).toPromise();
      await Promise.all(artists.map(artist => this.registerArtistOnFetch(artist)));
    } finally {
      artistKeys.forEach(key => this.runningQueries.delete(key));
    }
  }

  private async fetchArtistDetailsIfNeeded(artistId: number): Promise<void> {
    const artistDetailsKey = getArtistDetailsKey(artistId);
    if (this.bss.isOnline() && !this.store.isUpdated(artistDetailsKey)) {
      await runWithDedup(artistDetailsKey, this.runningQueries, async () => {
        const {artist, songs} = await this.httpClient.get<ArtistDetailsResponse>(`/api/artist/details-by-id/${artistId}`).toPromise();
        const details: ArtistDetails = {
          id: artist.id,
          songIds: songs.sort((s1, s2) => s1.title.localeCompare(s2.title)).map(s => s.id),
          version: artist.version,
        };
        await Promise.all([
          ...songs.map(s => this.store.set(getSongKey(s.id), s, needUpdateByVersionChange)),
          this.registerArtistOnFetch(artist),
          this.store.set(artistDetailsKey, details, needUpdateByVersionChange)]
        );
        if (this.browser) { // todo: find a better place for all-songs pre-fetch?
          this.fetchAndCacheMissedSongDetailsIfNeeded(songs.map(s => s.id)); // pre-fetch all songs
        }
      });
    }
  }

  getSongsByArtistId(artistId?: number): Observable<Song[]|undefined> {
    if (isInvalidId(artistId)) {
      return of([]);
    }
    return this.getArtistDetails(artistId)
        .pipe(
            flatMap(details => details === undefined ? of(undefined) : this.getSongsByIds(details.songIds)),
            map(songs => songs === undefined ? undefined : songs.filter(defined) as Song[])
        );
  }

  getArtistById(artistId?: number): Observable<(Artist|undefined)> {
    if (isInvalidId(artistId)) {
      return of(undefined);
    }
    return this.getArtistsByIds([artistId]).pipe(map(list => list[0]));
  }

  getArtistsByIds(artistIds: readonly number[]): Observable<(Artist|undefined)[]> {
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
  private async fetchAndCacheMissedArtists(artistIds: readonly number[]): Promise<void> {
    const missedArtistIds = await this.getMissedIds(ARTIST_KEY_PREFIX, artistIds);
    await this.fetchArtists(missedArtistIds);
  }

  getArtistByMount(artistMount: string): Observable<Artist|undefined> {
    return this.getAllArtists()
        .pipe(
            map(artists => artists.find(a => a.mount === artistMount)),
        );
  }

  getSongById(songId?: number): Observable<(Song|undefined)> {
    if (isInvalidId(songId)) {
      return of(undefined);
    }
    return this.getSongsByIds([songId]).pipe(map(list => list[0]));
  }

  getSongsByIds(songIds: readonly number[]): Observable<(Song|undefined)[]> {
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
    this.fetchAndCacheMissedSongDetailsIfNeeded([songId]).catch(err => console.warn(err));
    const songDetailsKey = getSongDetailsKey(songId);
    return this.store.get<SongDetails>(songDetailsKey);
  }

  /** Pre-fetches all song list items missed in cache. */
  private async fetchAndCacheMissedSongs(songIds: readonly number[]): Promise<void> {
    const missedSongIds = await this.getMissedIds(SONG_KEY_PREFIX, songIds);
    await this.fetchSongs(missedSongIds);
  }

  /** Pre-fetches all song list items missed in cache. */
  private async fetchAndCacheMissedSongDetailsIfNeeded(songIds: readonly number[]): Promise<void> {
    if (!this.bss.isOnline()) {
      return;
    }
    const missedSongIds = await this.getMissedIds(SONG_DETAIL_KEY_PREFIX, songIds);
    await this.fetchSongsDetails(missedSongIds);
  }

  private async fetchSongs(songIds: readonly number[]): Promise<void> {
    if (songIds.length === 0) {
      return;
    }
    const songKeys = songIds.map(id => getSongKey(id));
    songKeys.forEach(key => this.runningQueries.add(key));
    try {
      const songs = await this.httpClient.get<Song[]>(`/api/song/by-ids/${songIds}`).toPromise();
      await Promise.all(songs.map(song => this.store.set(getSongKey(song.id), song, needUpdateByVersionChange)));
    } finally {
      songKeys.forEach(key => this.runningQueries.delete(key));
    }
  }

  private async fetchSongsDetails(songIds: readonly number[]): Promise<void> {
    if (songIds.length === 0) {
      return;
    }
    const songDetailsKeys = songIds.map(id => getSongDetailsKey(id));
    songDetailsKeys.forEach(key => this.runningQueries.add(key));
    try {
      const detailsList = await this.httpClient.get<SongDetails[]>(`/api/song/details-by-ids/${songIds}`).toPromise();
      await Promise.all(detailsList.map(details => this.store.set(getSongDetailsKey(details.id), details, needUpdateByVersionChange)));
    } finally {
      songDetailsKeys.forEach(key => this.runningQueries.delete(key));
    }
  }

  getSongByMount(artistMount: string, songMount: string): Observable<Song|undefined> {
    return this.getArtistByMount(artistMount)
        .pipe(
            flatMap(artist => this.getSongsByArtistId(artist ? artist.id : undefined)),
            map(songs => songs === undefined ? undefined : songs.find(s => s.mount === songMount)),
        );
  }


  /** Returns list of ids missed in the store. */
  private async getMissedIds(keyPrefix: string, ids: readonly number[]): Promise<number[]> {
    if (ids.length === 0) {
      return [];
    }
    type EntityFlag = { id: number, found: boolean };
    const flag$Array: Observable<EntityFlag>[] = ids.map(
        id => combineLatest([of(id), this.store.get<WithNumId>(keyPrefix + id)])
            .pipe(map(([id, withId]) => ({id, found: withId !== undefined})))
    );

    const latestFlags$ = flag$Array.length === 0 ? of([]) : combineLatest(flag$Array);
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
