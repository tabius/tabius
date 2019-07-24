import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {Artist, ArtistDetails, Song, SongDetails} from '@common/artist-model';
import {flatMap, map, take} from 'rxjs/operators';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN} from '@common/constants';
import {fromPromise} from 'rxjs/internal-compatibility';
import {DeleteSongResponse, UpdateSongRequest, UpdateSongResponse} from '@common/ajax-model';
import {checkUpdateByShallowArrayCompare, checkUpdateByVersion, combineLatest0, defined, isValidId, mapToFirstInArray} from '@common/util/misc-utils';
import {DO_NOT_PREFETCH, ObservableStore, RefreshMode, skipUpdateCheck} from '@app/store/observable-store';
import {BrowserStateService} from '@app/services/browser-state.service';

const ARTIST_LIST_KEY = 'artist-list';
const ARTIST_KEY_PREFIX = 'artist-';
const ARTIST_DETAILS_KEY_PREFIX = 'artist-details-';
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

  getAllArtists(): Observable<Artist[]> {
    return this.store.get<number[]>(
        ARTIST_LIST_KEY,
        () => this.httpClient.get<Artist[]>('/api/artist/all')
            .pipe(
                flatMap(artists => combineLatest0(artists.map(a => fromPromise(this.updateArtistOnFetch(a))))),
                map(artists => artists.map(a => a.id))
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

  private async updateArtistOnFetch(artist: Artist): Promise<Artist> {
    await this.store.set<Artist>(getArtistKey(artist.id), artist, checkUpdateByVersion);
    return artist;
  }

  getArtistDetails(artistId: number|undefined): Observable<ArtistDetails|undefined> {
    return this.store.get<ArtistDetails>(
        getArtistDetailsKey(artistId),
        () => this.httpClient.get<ArtistDetails|undefined>(`/api/artist/details-by-id/${artistId}`),
        RefreshMode.RefreshOncePerSession,
        checkUpdateByVersion
    );
  }

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

  private async updateArtistSongsOnFetch(artistId: number, songs: Song[], updateArtistSongList: boolean): Promise<number[]> {
    const songUpdatesArray$$ = songs.map(song => this.store.set<Song>(getSongKey(song.id), song, checkUpdateByVersion));
    const songIds = songs.map(s => s.id);
    const songIdsSet = new Set<number>(songIds);

    const songListKey = getArtistSongListKey(artistId);
    const oldSongIds = await this.store.get<number[]>(songListKey, DO_NOT_PREFETCH, RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();
    const oldSongIdsToRemove = oldSongIds ? oldSongIds.filter(songId => !songIdsSet.has(songId)) : [];
    const songsToRemove$$ = oldSongIdsToRemove.map(id => this.store.remove(getSongKey(id)));
    const songDetailsToRemove$$ = oldSongIdsToRemove.map(id => this.store.remove(getSongDetailsKey(id)));

    const listingUpdate$$ = updateArtistSongList
        ? this.store.set<number[]>(songListKey, songIds, checkUpdateByShallowArrayCompare)
        : Promise.resolve();

    await Promise.all([
      listingUpdate$$,
      ...songUpdatesArray$$,
      ...songsToRemove$$,
      ...songDetailsToRemove$$,
    ]);
    return songIds;
  }

  getArtistByMount(artistMount: string): Observable<Artist|undefined> {
    return this.getAllArtists()
        .pipe(map(artists => artists.find(a => a.mount === artistMount)));
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

  getSongByMount(artistMount: string, songMount: string): Observable<Song|undefined> {
    return this.getArtistByMount(artistMount)
        .pipe(
            flatMap(artist => this.getArtistSongList(artist && artist.id)),
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
}

function getArtistKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_KEY_PREFIX + artistId : undefined;
}

function getArtistDetailsKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_DETAILS_KEY_PREFIX + artistId : undefined;
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
