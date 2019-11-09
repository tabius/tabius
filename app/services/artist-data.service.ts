import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {Artist, ArtistDetails, Song, SongDetails} from '@common/artist-model';
import {flatMap, map, take} from 'rxjs/operators';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN} from '@common/constants';
import {fromPromise} from 'rxjs/internal-compatibility';
import {CreateArtistRequest, CreateArtistResponse, DeleteSongResponse, UpdateSongRequest, UpdateSongResponse} from '@common/ajax-model';
import {checkUpdateByReference, checkUpdateByShallowArrayCompare, checkUpdateByVersion, combineLatest0, defined, isValidId, mapToFirstInArray, waitForAllPromisesAndReturnFirstArg} from '@common/util/misc-utils';
import {ObservableStore, RefreshMode} from '@app/store/observable-store';
import {BrowserStateService} from '@app/services/browser-state.service';

const ARTIST_LIST_KEY = 'artist-list';
const ARTIST_KEY_PREFIX = 'artist-';
const ARTIST_DETAILS_KEY_PREFIX = 'artist-details-';
const ARTIST_MOUNT_KEY_PREFIX = 'artist-mount-';
const ARTIST_SONG_LIST_KEY_PREFIX = 'artist-songs-';
const SONG_KEY_PREFIX = 'song-';
const SONG_DETAIL_KEY_PREFIX = 'song-details-';

@Injectable({
  providedIn: 'root'
})
export class ArtistDataService {

  constructor(private readonly httpClient: HttpClient,
              private readonly bss: BrowserStateService,
              @Inject(TABIUS_ARTISTS_BROWSER_STORE_TOKEN) private readonly store: ObservableStore) {
  }

  getArtistList(): Observable<Artist[]> {
    return this.store.get<number[]>(
        ARTIST_LIST_KEY,
        () => this.httpClient.get<Artist[]>('/api/artist/all-listed')
            .pipe(
                // Perform blocking update here for all artists first.
                // Reason: this caching prevents a lot of parallel getArtist() HTTP requests usually started immediately after the listing is received.
                flatMap(artists => waitForAllPromisesAndReturnFirstArg(artists, artists.map(a => this.updateArtistOnFetch(a)))),
                map(artists => artists.map(a => a.id)),
            ),
        RefreshMode.RefreshOncePerSession,
        checkUpdateByShallowArrayCompare,
    )
        .pipe(
            flatMap(ids => combineLatest0((ids || []).map(id => this.getArtistById(id)))),
            map(items => (items.filter(defined) as Artist[])),
        );
  }

  getArtistById(artistId: number|undefined): Observable<(Artist|undefined)> {
    return this.store.get<Artist>(
        getArtistKey(artistId),
        () => this.httpClient.get<Artist[]>(`/api/artist/by-ids/${artistId}`).pipe(mapToFirstInArray),
        RefreshMode.RefreshOncePerSession,
        checkUpdateByVersion,
    );
  }

  getArtistsByIds(artistIds: readonly number[]): Observable<(Artist|undefined)[]> {
    return combineLatest0(artistIds.map(id => this.getArtistById(id)));
  }

  private updateArtistOnFetch(artist: Artist|undefined): Promise<unknown> {
    if (!artist) {
      return Promise.resolve();
    }
    return Promise.all([
      this.store.set<Artist>(getArtistKey(artist.id), artist, checkUpdateByVersion),
      this.store.set<number>(getArtistIdByMountKey(artist.mount), artist.id, checkUpdateByReference)
    ]);
  }

  getArtistDetails(artistId: number|undefined): Observable<ArtistDetails|undefined> {
    return this.store.get<ArtistDetails>(
        getArtistDetailsKey(artistId),
        () => this.httpClient.get<ArtistDetails|undefined>(`/api/artist/details-by-id/${artistId}`),
        RefreshMode.RefreshOncePerSession,
        checkUpdateByVersion
    );
  }

  /** Returns list of all artist song ids. The songs in the list are always sorted by id. */
  getArtistSongList(artistId: number|undefined): Observable<number[]|undefined> {
    return this.store.get<number[]>(
        getArtistSongListKey(artistId),
        () => this.httpClient.get<Song[]>(`/api/song/by-artist/${artistId}`)
            .pipe(
                flatMap(songs => fromPromise(this.updateArtistSongsOnFetch(artistId!, songs, false)))
            ),
        RefreshMode.RefreshOncePerSession,
        checkUpdateByShallowArrayCompare
    );
  }

  // TODO: cleanup songs that are not in the list anymore? Schedule GC by time?
  private async updateArtistSongsOnFetch(artistId: number, songs: Song[], updateArtistSongList: boolean): Promise<number[]> {
    const songUpdatesArray$$ = songs.map(song => this.store.set<Song>(getSongKey(song.id), song, checkUpdateByVersion));
    const songIds = songs.map(s => s.id);

    // noinspection ES6MissingAwait
    const listingUpdate$$ = updateArtistSongList
        ? this.store.set<number[]>(getArtistSongListKey(artistId), songIds, checkUpdateByShallowArrayCompare)
        : Promise.resolve();

    await Promise.all([
      ...songUpdatesArray$$,
      listingUpdate$$,
    ]);
    return songIds;
  }

  getArtistIdByMount(artistMount: string|undefined): Observable<number|undefined> {
    return this.store.get<number>(
        getArtistIdByMountKey(artistMount),
        () => this.httpClient.get<Artist|undefined>(`/api/artist/by-mount/${artistMount}`)
            .pipe( // wait for update before continue.
                flatMap(a => waitForAllPromisesAndReturnFirstArg(a, [this.updateArtistOnFetch(a)])),
                map(a => a && a.id)
            ),
        RefreshMode.RefreshOncePerSession,
        checkUpdateByReference,
    );
  }

  getSongById(songId: number|undefined): Observable<(Song|undefined)> {
    return this.store.get<Song>(
        getSongKey(songId),
        () => this.httpClient.get<Song[]>(`/api/song/by-ids/${songId}`).pipe(mapToFirstInArray),
        RefreshMode.RefreshOncePerSession,
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
        refreshCachedVersion ? RefreshMode.RefreshOncePerSession : RefreshMode.DoNotRefresh,
        checkUpdateByVersion
    );
  }

  getSongByMount(artistId: number|undefined, songMount: string|undefined): Observable<Song|undefined> {
    if (!isValidId(artistId) || !songMount) {
      return of(undefined);
    }
    return this.getArtistSongList(artistId)
        .pipe(
            flatMap(songIds => songIds ? this.getSongsByIds(songIds) : of([])),
            map(songsIds => songsIds.find(s => s !== undefined && s.mount === songMount)),
        );
  }

  async createSong(song: Song, details: SongDetails): Promise<void> {
    const request: UpdateSongRequest = {song, details};
    const response = await this.httpClient.post<UpdateSongResponse>('/api/song', request).pipe(take(1)).toPromise();
    await this.processSongUpdateResponse(response);
  }

  async updateSong(song: Song, details: SongDetails): Promise<void> {
    const request: UpdateSongRequest = {song, details};
    const response = await this.httpClient.put<UpdateSongResponse>('/api/song', request).pipe(take(1)).toPromise();
    await this.processSongUpdateResponse(response);
  }

  private async processSongUpdateResponse(response: UpdateSongResponse): Promise<void> {
    await Promise.all([
      this.store.set<Song>(getSongKey(response.song.id), response.song, checkUpdateByVersion),
      this.store.set<SongDetails>(getSongDetailsKey(response.details.id), response.details, checkUpdateByVersion),
      this.updateArtistSongsOnFetch(response.song.artistId, response.songs, true),
    ]);
  }

  async deleteSong(songId: number|undefined): Promise<void> {
    if (!isValidId(songId)) {
      return;
    }
    const {artistId, songs} = await this.httpClient.delete<DeleteSongResponse>(`/api/song/${songId}`).pipe(take(1)).toPromise();
    await Promise.all([
      this.store.remove<Song>(getSongDetailsKey(songId)),
      this.store.remove<SongDetails>(getSongDetailsKey(songId))
    ]);
    await this.updateArtistSongsOnFetch(artistId, songs, true);
  }

  async createArtist(createArtistRequest: CreateArtistRequest): Promise<Artist> {
    const response = await this.httpClient.post<CreateArtistResponse>('/api/artist', createArtistRequest).pipe(take(1)).toPromise();
    const artistsUpdateArray$$ = response.artists.map(artist => this.store.set<Artist>(getArtistKey(artist.id), artist, checkUpdateByVersion));
    const listingUpdate$$ = this.store.set(ARTIST_LIST_KEY, response.artists.map(artist => artist.id), checkUpdateByShallowArrayCompare);
    await Promise.all([
      ...artistsUpdateArray$$,
      listingUpdate$$,
    ]);
    const artist = response.artists.find(artist => artist.mount === createArtistRequest.mount);
    if (!artist) {
      throw new Error('Не удалось создать артиста!');
    }
    return artist;
  }
}

function getArtistKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_KEY_PREFIX + artistId : undefined;
}

function getArtistDetailsKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_DETAILS_KEY_PREFIX + artistId : undefined;
}

function getArtistIdByMountKey(artistMount: string|undefined): string|undefined {
  return artistMount && artistMount.length > 0 ? ARTIST_MOUNT_KEY_PREFIX + artistMount : undefined;
}

function getArtistSongListKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_SONG_LIST_KEY_PREFIX + artistId : undefined;
}

function getSongKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_KEY_PREFIX + songId : undefined;
}

function getSongDetailsKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_DETAIL_KEY_PREFIX + songId : undefined;
}

