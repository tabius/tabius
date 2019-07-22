import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Artist, ArtistDetails, Song, SongDetails} from '@common/artist-model';
import {flatMap, map, take, tap} from 'rxjs/operators';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN} from '@common/constants';
import {fromPromise} from 'rxjs/internal-compatibility';
import {ArtistDetailsResponse, SongUpdateRequest, SongUpdateResponse} from '@common/ajax-model';
import {checkUpdateByShallowArrayCompare, checkUpdateByVersion, combineLatest0, defined, isValidId, mapToFirstInArray} from '@common/util/misc-utils';
import {BrowserStore, DO_REFRESH} from '@app/store/browser-store';
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

  constructor(private readonly httpClient: HttpClient,
              private readonly bss: BrowserStateService,
              @Inject(TABIUS_ARTISTS_BROWSER_STORE_TOKEN) private readonly store: BrowserStore) {
  }

  getAllArtists(): Observable<Artist[]> {
    return this.store.get<number[]>(
        ARTIST_LIST_KEY,
        () => this.httpClient.get<Artist[]>('/api/artist/all')
            .pipe(
                flatMap(artists => combineLatest0(artists.map(a => fromPromise(this.registerArtistOnFetch(a))))),
                map(artists => artists.map(a => a.id))
            ),
        DO_REFRESH,
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
        DO_REFRESH,
        checkUpdateByVersion,
    );
  }

  getArtistsByIds(artistIds: readonly number[]): Observable<(Artist|undefined)[]> {
    return combineLatest0(artistIds.map(id => this.getArtistById(id)));
  }

  private async registerArtistOnFetch(artist: Artist): Promise<Artist> {
    await this.store.set(getArtistKey(artist.id), artist, checkUpdateByVersion);
    return artist;
  }

  getArtistDetails(artistId: number|undefined): Observable<ArtistDetails|undefined> {
    return this.store.get<ArtistDetails>(
        getArtistDetailsKey(artistId),
        () => this.httpClient.get<ArtistDetailsResponse|undefined>(`/api/artist/details-by-id/${artistId}`)
            .pipe(
                flatMap(response => fromPromise(this.registerArtistDetailsOnFetch(response))),
                tap(details => { //todo: find a better place for this heuristic based pre-fetch.
                  if (details) {
                    details.songIds.forEach(id => this.getSongDetailsById(id));
                  }
                }),
            ),
        DO_REFRESH,
        checkUpdateByVersion
    );
  }

  private async registerArtistDetailsOnFetch(response: ArtistDetailsResponse|undefined): Promise<ArtistDetails|undefined> {
    if (!response) {
      return undefined;
    }
    await Promise.all([
      this.registerArtistOnFetch(response.artist),
      response.songs.map(s => this.registerSongOnFetch(s))
    ]);
    return {
      id: response.artist.id,
      version: response.artist.version,
      songIds: response.songs.sort((s1, s2) => s1.title.localeCompare(s2.title)).map(s => s.id),
      bandIds: response.bandIds,
      listed: response.listed,
    };
  }

  getArtistByMount(artistMount: string): Observable<Artist|undefined> {
    return this.getAllArtists()
        .pipe(
            map(artists => artists.find(a => a.mount === artistMount)),
        );
  }

  getSongById(songId?: number): Observable<(Song|undefined)> {
    return this.store.get<Song>(
        getSongKey(songId),
        () => this.httpClient.get<Song[]>(`/api/song/by-ids/${songId}`).pipe(mapToFirstInArray),
        DO_REFRESH,
        checkUpdateByVersion,
    );
  }

  getSongsByIds(songIds: readonly number[]): Observable<(Song|undefined)[]> {
    return combineLatest0(songIds.map(id => this.getSongById(id)));
  }

  private async registerSongOnFetch(song: Song): Promise<Song> {
    await this.store.set(getSongKey(song.id), song, checkUpdateByVersion);
    return song;
  }

  getSongDetailsById(songId: number|undefined): Observable<SongDetails|undefined> {
    return this.store.get<SongDetails>(
        getSongDetailsKey(songId),
        () => this.httpClient.get<SongDetails[]>(`/api/song/details-by-ids/${songId}`).pipe(mapToFirstInArray),
        DO_REFRESH,
        checkUpdateByVersion
    );
  }

  getSongByMount(artistMount: string, songMount: string): Observable<Song|undefined> {
    return this.getArtistByMount(artistMount)
        .pipe(
            flatMap(artist => this.getArtistDetails(artist ? artist.id : undefined)),
            flatMap(details => this.getSongsByIds(details ? details.songIds : [])),
            map(songs => songs.find(s => s !== undefined && s.mount === songMount)),
        );
  }

  async createSong(song: Song, details: SongDetails): Promise<void> {
    const request: SongUpdateRequest = {song, details};
    const response = await this.httpClient.post<SongUpdateResponse>(`/api/song`, request).pipe(take(1)).toPromise();
    await this.store.set(getSongKey(response.song.id), response.song, checkUpdateByVersion);
    await this.store.set(getSongDetailsKey(response.details.id), response.details, checkUpdateByVersion);
  }

  async updateSong(song: Song, details: SongDetails): Promise<void> {
    const request: SongUpdateRequest = {song, details};
    const response = await this.httpClient.put<SongUpdateResponse>(`/api/song`, request).pipe(take(1)).toPromise();
    await this.store.set(getSongKey(response.song.id), response.song, checkUpdateByVersion);
    await this.store.set(getSongDetailsKey(response.details.id), response.details, checkUpdateByVersion);
  }

  async deleteSong(songId?: number): Promise<void> {
    if (!isValidId(songId)) {
      return;
    }
    const details = await this.httpClient.delete<ArtistDetailsResponse>('/api/song/' + songId).pipe(take(1)).toPromise();
    await this.registerArtistDetailsOnFetch(details);
  }
}

function getArtistDetailsKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_DETAILS_KEY_PREFIX + artistId : undefined;
}

function getArtistKey(artistId: number|undefined): string|undefined {
  return isValidId(artistId) ? ARTIST_KEY_PREFIX + artistId : undefined;
}

function getSongKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_KEY_PREFIX + songId : undefined;
}

function getSongDetailsKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_DETAIL_KEY_PREFIX + songId : undefined;
}
