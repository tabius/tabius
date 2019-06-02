import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest, Observable, of} from 'rxjs';
import {newDefaultUserDeviceSettings, newDefaultUserSongSettings, Playlist, UserDeviceSettings, UserSettings, UserSongSettings} from '@common/user-model';
import {BrowserStore} from '@app/store/browser-store';
import {catchError, flatMap, map, switchMap} from 'rxjs/operators';
import {TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {UserSessionState} from '@app/store/user-session-state';
import {isInvalidId, isValidId, needUpdateByShallowArrayCompare, needUpdateByStringify, needUpdateByVersionChange} from '@common/util/misc_utils';

const DEVICE_SETTINGS_KEY = 'device-settings';
const USER_SETTINGS_KEY = 'song-settings-key';
const SONG_SETTINGS_KEY_PREFIX = 'ss-';
const USER_PLAYLISTS_KEY = 'playlists';
const PLAYLIST_PREFIX_KEY = 'playlist-';
const B4SI_FLAG_KEY = 'b4Si';

/** Data that belongs to the active user. */
@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  private state = new UserDataState();

  constructor(private readonly httpClient: HttpClient,
              private readonly session: UserSessionState,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly store: BrowserStore) {
  }

  getUserDeviceSettings(): Observable<UserDeviceSettings> {
    return this.store.get<UserDeviceSettings|undefined>(DEVICE_SETTINGS_KEY)
        .pipe(map(s => s || newDefaultUserDeviceSettings()));
  }

  setUserDeviceSettings(userDeviceSettings: UserDeviceSettings): void {
    this.store.set(DEVICE_SETTINGS_KEY, userDeviceSettings, needUpdateByStringify);
  }

  getUserSongSettings(songId: number): Observable<UserSongSettings> {
    return this.session.user$.pipe(
        switchMap(user => {
          this.fetchUserSettingsIfNeeded(user);
          const key = getUserSongSettingsKey(songId);
          return this.store.get<UserSongSettings|undefined>(key)
              .pipe(map(songSettings => songSettings || newDefaultUserSongSettings(songId)));
        }));
  }

  private fetchUserSettingsIfNeeded(user): void {
    if (!this.store.isUpdated(USER_SETTINGS_KEY) && user !== undefined) {
      this.httpClient.get(`/api/user/settings`, {observe: 'response'})
          .pipe(catchError(response => of({...response, body: undefined})))
          .subscribe(response => {
                if (response.ok) {
                  this.updateUserSettingsOnFetch(response.body);
                }
              }
          );
    }
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    await this.store.set(key, songSettings, needUpdateByStringify);
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      this.httpClient.put(`/api/user/settings/song`, songSettings, {observe: 'response'})
          .pipe(catchError(response => of({...response, body: undefined})))
          .subscribe(response => {
                if (response.ok) {
                  //todo: concurrent callbacks!
                  this.updateUserSettingsOnFetch(response.body);
                }
              }
          );
    }
  }

  getB4SiFlag(): Observable<boolean> {
    return this.session.user$.pipe(
        switchMap(user => {
          this.fetchUserSettingsIfNeeded(user);
          return this.store.get<boolean>(B4SI_FLAG_KEY).pipe(
              map(flag => flag === undefined ? false : flag),
              // tap(flag => console.log(flag)),
          );
        })
    );
  }

  async setB4SiFlag(b4SiFlag: boolean): Promise<void> {
    await this.store.set(B4SI_FLAG_KEY, b4SiFlag || undefined); //todo: need update?
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      this.httpClient.put(`/api/user/settings/b4si`, {b4SiFlag: b4SiFlag}, {observe: 'response'})
          .pipe(catchError(response => of({...response, body: undefined})))
          .subscribe(response => {
                if (response.ok) {
                  //todo: concurrent callbacks!
                  this.updateUserSettingsOnFetch(response.body);
                }
              }
          );
    }
  }

  updateUserSettingsOnFetch(userSettings: UserSettings): void {
    this.store.set(USER_SETTINGS_KEY, Date.now());
    for (const songId in userSettings.songs) {
      const songSettings = userSettings.songs[songId];
      const key = getUserSongSettingsKey(songId);
      this.store.set(key, songSettings, needUpdateByStringify);
    }
    this.store.set(B4SI_FLAG_KEY, userSettings.b4Si || undefined);
  }

  getUserPlaylists(): Observable<Playlist[]> {
    return this.session.user$.pipe(
        switchMap(user => {
          if (!this.store.isUpdated(USER_PLAYLISTS_KEY) && user !== undefined) {
            this.httpClient.get(`/api/playlist/by-current-user`, {observe: 'response'})
                .pipe(catchError(response => of({...response, body: undefined})))
                .subscribe(response => {
                      if (response.ok) {
                        this.cachePlaylistsInBrowserStoreOnFetch(response.body);
                      }
                    }
                );
          }
          return this.store.get<number[]>(USER_PLAYLISTS_KEY).pipe(
              flatMap(ids =>
                  ids && ids.length > 0
                      ? combineLatest(ids.map(id => this.store.get<Playlist>(getPlaylistKey(id))))
                      : of([])
              ),
              map(array => array.filter(v => v !== undefined) as Playlist[]),
          ) as Observable<Playlist[]>;
        }));
  }

  async updateUserPlaylist(playlist: Playlist): Promise<void> {
    // Note: playlists can be managed only when online.
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      this.httpClient.put(`/api/playlist/update`, playlist, {observe: 'response'})
          .pipe(catchError(response => of({...response, body: undefined})))
          .subscribe(response => {
                if (response.ok) {
                  this.cachePlaylistsInBrowserStoreOnFetch(response.body); //todo: concurrent callbacks?
                }
              }
          );
    }
  }

  async createUserPlaylist(playlist: Playlist): Promise<void> {
    // Note: playlists can be managed only when online.
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      this.httpClient.post(`/api/playlist/create`, playlist, {observe: 'response'})
          .pipe(catchError(response => of({...response, body: undefined})))
          .subscribe(response => {
                if (response.ok) {
                  this.cachePlaylistsInBrowserStoreOnFetch(response.body); //todo: concurrent callbacks?
                }
              }
          );
    }
  }

  async deleteUserPlaylist(playlistId: number): Promise<void> {
    // Note: playlists can be managed only when online.
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      this.httpClient.post(`/api/playlist/delete`, playlistId, {observe: 'response'})
          .pipe(catchError(response => of({...response, body: undefined})))
          .subscribe(response => {
                if (response.ok) {
                  this.cachePlaylistsInBrowserStoreOnFetch(response.body); //todo: concurrent callbacks?
                }
              }
          );
    }
  }

  cachePlaylistsInBrowserStoreOnFetch(playlists: Playlist[]): void {
    this.store.set(USER_PLAYLISTS_KEY, playlists.map(p => p.id), needUpdateByShallowArrayCompare);
    for (const playlist of playlists) {
      this.state.playlistIdByMount.set(playlist.mount, playlist.id);
      this.store.set(getPlaylistKey(playlist.id), playlist, needUpdateByVersionChange);
    }
    //todo: cleanup removed playlists?
  }

  getPlaylistByMount(mount: string): Observable<Playlist|undefined> {
    const playlistId = this.state.playlistIdByMount.get(mount);
    if (isValidId(playlistId)) {
      return playlistId > 0 ? this.getPlaylistById(playlistId) : of(undefined);
    }
    return this.httpClient.get(`/api/playlist/by-mount/${mount}`, {observe: 'response'})
        .pipe(
            catchError(response => of({...response, body: undefined})),
            switchMap(response => response.ok && response.body ? this.registerPlaylistAndGet(response.body) : of(undefined))
        );
  }

  getPlaylistById(playlistId?: number): Observable<Playlist|undefined> {
    if (isInvalidId(playlistId)) {
      return of(undefined);
    }
    const playlistKey = getPlaylistKey(playlistId);
    if (this.store.isUpdated(playlistKey)) {
      return this.store.get<Playlist>(playlistKey);
    }
    return this.httpClient.get(`/api/playlist/by-id/${playlistId}`, {observe: 'response'})
        .pipe(
            catchError(response => of({...response, body: undefined})),
            switchMap(response => response.ok && response.body ? this.registerPlaylistAndGet(response.body) : of(undefined))
        );
  }

  private registerPlaylistAndGet(playlist: Playlist): Observable<Playlist|undefined> {
    const key = getPlaylistKey(playlist.id);
    this.state.playlistIdByMount.set(playlist.mount, playlist.id);
    this.store.set(key, playlist, needUpdateByVersionChange);
    return this.store.get<Playlist>(key);
  }

  async cleanupUserDataOnSignout(): Promise<void> {
    this.state = new UserDataState();
    this.store.clear();
  }
}

class UserDataState {
  readonly playlistIdByMount = new Map<string, number>();
}

function getUserSongSettingsKey(songId: number|string): string {
  return SONG_SETTINGS_KEY_PREFIX + songId;
}

function getPlaylistKey(playlistId: number): string {
  return PLAYLIST_PREFIX_KEY + playlistId;
}
