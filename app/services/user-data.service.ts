import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest, Observable, of} from 'rxjs';
import {newDefaultUserDeviceSettings, newDefaultUserSongSettings, Playlist, User, UserDeviceSettings, UserSettings, UserSongSettings} from '@common/user-model';
import {BrowserStore} from '@app/store/browser-store';
import {flatMap, map, switchMap} from 'rxjs/operators';
import {TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {UserSessionState} from '@app/store/user-session-state';
import {needUpdateByShallowArrayCompare, needUpdateByStringify, needUpdateByVersionChange} from '@common/util/misc-utils';
import {CreatePlaylistRequest, CreatePlaylistResponse, DeletePlaylistResponse, UpdatePlaylistResponse} from '@common/ajax-model';

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

  constructor(private readonly httpClient: HttpClient,
              private readonly session: UserSessionState,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly store: BrowserStore,
  ) {
  }

  getUserDeviceSettings(): Observable<UserDeviceSettings> {
    return this.store.get<UserDeviceSettings|undefined>(DEVICE_SETTINGS_KEY)
        .pipe(map(s => s || newDefaultUserDeviceSettings()));
  }

  async setUserDeviceSettings(userDeviceSettings: UserDeviceSettings): Promise<void> {
    await this.store.set(DEVICE_SETTINGS_KEY, userDeviceSettings, needUpdateByStringify);
  }

  getUserSongSettings(songId: number): Observable<UserSongSettings> {
    return this.session.user$.pipe(
        switchMap(user => {
          this.fetchUserSettingsIfNeeded(user).catch(err => console.warn(err));
          const key = getUserSongSettingsKey(songId);
          return this.store.get<UserSongSettings|undefined>(key)
              .pipe(map(songSettings => songSettings || newDefaultUserSongSettings(songId)));
        }));
  }

  private async fetchUserSettingsIfNeeded(user?: User): Promise<void> {
    if (!this.store.isUpdated(USER_SETTINGS_KEY) && user !== undefined) {
      const settings = await this.httpClient.get<UserSettings>(`/api/user/settings`).toPromise();
      await this.updateUserSettingsOnFetch(settings);
    }
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    await this.store.set(key, songSettings, needUpdateByStringify);
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/song`, songSettings).toPromise();
      await this.updateUserSettingsOnFetch(settings);
    }
  }

  getB4SiFlag(): Observable<boolean> {
    return this.session.user$.pipe(
        switchMap(user => {
          this.fetchUserSettingsIfNeeded(user).catch(err => console.warn(err));
          return this.store.get<boolean>(B4SI_FLAG_KEY)
              .pipe(
                  map(flag => flag === undefined ? false : flag),
              );
        })
    );
  }

  async setB4SiFlag(b4SiFlag: boolean): Promise<void> {
    await this.store.set(B4SI_FLAG_KEY, b4SiFlag || undefined); //todo: need update?
    const signedIn = await this.session.isSignedIn();
    if (signedIn) {
      const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/b4si`, {b4SiFlag: b4SiFlag}).toPromise();
      await this.updateUserSettingsOnFetch(settings);
    }
  }

  async updateUserSettingsOnFetch(userSettings: UserSettings): Promise<void> {
    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set(USER_SETTINGS_KEY, Date.now()));
    for (const songId in userSettings.songs) {
      const songSettings = userSettings.songs[songId];
      const key = getUserSongSettingsKey(songId);
      allOps.push(this.store.set(key, songSettings, needUpdateByStringify));
    }
    allOps.push(this.store.set(B4SI_FLAG_KEY, userSettings.b4Si || undefined));
    await Promise.all(allOps);
  }

  getUserPlaylists(): Observable<Playlist[]> {
    return this.session.user$.pipe(
        switchMap(user => {
          this.fetchUserPlaylistsIfNeeded(user).catch(err => console.warn(err));
          return this.store.get<string[]>(USER_PLAYLISTS_KEY).pipe(
              flatMap(ids =>
                  ids && ids.length > 0
                      ? combineLatest(ids.filter(m => isValidPlaylistId(m)).map(m => this.store.get<Playlist>(getPlaylistKey(m))))
                      : of([])
              ),
              map(array => array.filter(v => v !== undefined) as Playlist[]),
          ) as Observable<Playlist[]>;
        }));
  }

  private async fetchUserPlaylistsIfNeeded(user): Promise<void> {
    if (!this.store.isUpdated(USER_PLAYLISTS_KEY) && user !== undefined) {
      const playlists = await this.httpClient.get<Playlist[]>(`/api/playlist/by-current-user`).toPromise();
      await this.cachePlaylistsInBrowserStoreOnFetch(playlists);
      //todo: cleanup removed playlists?
    }
  }

  async createUserPlaylist(createPlaylistRequest: CreatePlaylistRequest): Promise<void> {
    await this.session.requireSignIn();
    const response = await this.httpClient.post<CreatePlaylistResponse>(`/api/playlist/create`, createPlaylistRequest).toPromise();
    await this.cachePlaylistsInBrowserStoreOnFetch(response);
  }

  async updateUserPlaylist(playlist: Playlist): Promise<void> {
    await this.session.requireSignIn();
    const response = await this.httpClient.put<UpdatePlaylistResponse>(`/api/playlist/update`, playlist).toPromise();
    await this.cachePlaylistsInBrowserStoreOnFetch(response);
  }

  async deleteUserPlaylist(playlistId: string): Promise<void> {
    await this.session.requireSignIn();
    const response = await this.httpClient.delete<DeletePlaylistResponse>(`/api/playlist/delete/${playlistId}`).toPromise();
    await this.cachePlaylistsInBrowserStoreOnFetch(response);
  }

  async cachePlaylistsInBrowserStoreOnFetch(playlists: readonly Playlist[]): Promise<void> {
    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set(USER_PLAYLISTS_KEY, playlists.map(p => p.id), needUpdateByShallowArrayCompare));
    for (const playlist of playlists) {
      allOps.push(this.store.set(getPlaylistKey(playlist.id), playlist, needUpdateByVersionChange));
    }
    await Promise.all(allOps);
  }

  getPlaylist(playlistId?: string): Observable<Playlist|undefined> {
    if (!isValidPlaylistId(playlistId)) {
      return of(undefined);
    }
    this.fetchPlaylistIfNeeded(playlistId).catch(err => console.warn(err));
    const playlistKey = getPlaylistKey(playlistId);
    return this.store.get<Playlist>(playlistKey);
  }

  private async fetchPlaylistIfNeeded(playlistId: string): Promise<void> {
    const playlistKey = getPlaylistKey(playlistId);
    if (!this.store.isUpdated(playlistKey)) {
      const playlist = await this.httpClient.get<Playlist>(`/api/playlist/by-id/${playlistId}`).toPromise();
      await this.cachePlaylistsInBrowserStoreOnFetch([playlist]);
    }
  }

  async cleanupUserDataOnSignout(): Promise<void> {
    await this.store.clear();
  }
}

function getUserSongSettingsKey(songId: number|string): string {
  return SONG_SETTINGS_KEY_PREFIX + songId;
}

function getPlaylistKey(playlistId: string): string {
  return PLAYLIST_PREFIX_KEY + playlistId;
}

function isValidPlaylistId(playlistId?: unknown): playlistId is string {
  return typeof playlistId === 'string' && playlistId.length >= 6;
}
