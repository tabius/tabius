import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {DEFAULT_B4SI_FLAG, newDefaultUserDeviceSettings, newDefaultUserSettings, newDefaultUserSongSettings, Playlist, User, UserDeviceSettings, UserSettings, UserSongSettings} from '@common/user-model';
import {BrowserStore, DO_NOT_PREFETCH, DO_NOT_REFRESH, DO_REFRESH} from '@app/store/browser-store';
import {flatMap, map, switchMap, take, tap} from 'rxjs/operators';
import {TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {checkUpdateByReference, checkUpdateByShallowArrayCompare, checkUpdateByStringify, checkUpdateByVersion, combineLatest0, defined, isValidId, keepDefined, skipUpdateCheck} from '@common/util/misc-utils';
import {CreatePlaylistRequest, CreatePlaylistResponse, DeletePlaylistResponse, UpdatePlaylistResponse} from '@common/ajax-model';

const DEVICE_SETTINGS_KEY = 'device-settings';
const USER_SETTINGS_FETCH_DATE_KEY = 'user-settings-fetch-date';
const SONG_SETTINGS_KEY_PREFIX = 'ss-';
const USER_PLAYLISTS_KEY = 'playlists';
const PLAYLIST_PREFIX_KEY = 'playlist-';
const B4SI_FLAG_KEY = 'b4Si';
const USER_KEY = 'user';

/** Data that belongs to the active user. */
@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  constructor(private readonly httpClient: HttpClient,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly store: BrowserStore,
  ) {
  }

  getUserDeviceSettings(): Observable<UserDeviceSettings> {
    return this.store.get<UserDeviceSettings>(
        DEVICE_SETTINGS_KEY,
        DO_NOT_PREFETCH,
        DO_NOT_REFRESH,
        skipUpdateCheck
    ).pipe(map(s => s || newDefaultUserDeviceSettings()));
  }

  async setUserDeviceSettings(userDeviceSettings: UserDeviceSettings): Promise<void> {
    await this.store.set(DEVICE_SETTINGS_KEY, userDeviceSettings, checkUpdateByStringify);
  }

  getUserSongSettings(songId: number|undefined): Observable<UserSongSettings> {
    if (!isValidId(songId)) {
      return of(newDefaultUserSongSettings(0));
    }
    return this.getUser().pipe(
        switchMap(user => {
          if (!user) {
            return of(newDefaultUserSongSettings(songId));
          }
          return this.store.get<UserSongSettings>(
              getUserSongSettingsKey(songId),
              () => this.fetchAndProcessUserSettings(user).pipe(map(userSettings => userSettings.songs[songId])),
              DO_NOT_REFRESH, // refreshed on every login as a part of login response
              checkUpdateByStringify
          ).pipe(map(songSettings => songSettings || newDefaultUserSongSettings(songId)));
        }));
  }

  private fetchAndProcessUserSettings(user: User|undefined): Observable<UserSettings> {
    if (!user) {
      return of(newDefaultUserSettings());
    }
    return this.httpClient.get<UserSettings>(`/api/user/settings`)
        .pipe(tap(userSettings => this.updateUserSettingsOnFetch(userSettings)));
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    await this.store.set(key, songSettings, checkUpdateByStringify);
    const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/song`, songSettings).pipe(take(1)).toPromise();
    await this.updateUserSettingsOnFetch(settings);
  }

  getB4SiFlag(): Observable<boolean> {
    return this.getUser().pipe(
        switchMap(user => {
          if (!user) {
            return of(DEFAULT_B4SI_FLAG);
          }
          return this.store.get<boolean>(
              B4SI_FLAG_KEY,
              () => this.fetchAndProcessUserSettings(user).pipe(map(userSettings => userSettings.b4Si)),
              DO_REFRESH,
              checkUpdateByReference
          ).pipe(map(flag => flag === undefined ? false : flag));
        })
    );
  }

  async setB4SiFlag(b4SiFlag: boolean): Promise<void> {
    await this.store.set(B4SI_FLAG_KEY, b4SiFlag || undefined); //todo: need update?
    const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/b4si`, {b4SiFlag: b4SiFlag}).pipe(take(1)).toPromise();
    await this.updateUserSettingsOnFetch(settings);
  }

  /** Used to dedup updates triggered by the same de-multiplexed fetch call.*/
  private lastUpdatedSettings?: UserSettings;

  async updateUserSettingsOnFetch(userSettings: UserSettings): Promise<void> {
    if (this.lastUpdatedSettings === userSettings) {
      return;
    }
    this.lastUpdatedSettings = userSettings;
    const oldSongSettings = await this.store.list<UserSongSettings>(SONG_SETTINGS_KEY_PREFIX);

    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set(USER_SETTINGS_FETCH_DATE_KEY, Date.now()));
    const updatedKeys = new Set<string>();
    for (const songId in userSettings.songs) {
      const songSettings = userSettings.songs[songId];
      const key = getUserSongSettingsKey(songSettings.songId);
      updatedKeys.add(key);
      allOps.push(this.store.set(key, songSettings, checkUpdateByStringify));
    }

    // delete missed settings.
    for (const kv of oldSongSettings) {
      if (!updatedKeys.has(kv.key)) {
        allOps.push(this.store.set(kv.key, undefined));
      }
    }

    allOps.push(this.store.set(B4SI_FLAG_KEY, userSettings.b4Si || undefined));
    await Promise.all(allOps);
  }

  getUserPlaylists(): Observable<Playlist[]> {
    return this.getUser().pipe(
        switchMap(user => {
          if (!user) {
            return of([]);
          }
          return this.store.get<string[]>(
              USER_PLAYLISTS_KEY,
              () => this.httpClient.get<Playlist[]>(`/api/playlist/by-current-user`)
                  .pipe(
                      tap(playlists => this.cachePlaylists(playlists)),
                      map(playlists => playlists ? playlists.map(p => p.id) : []),
                  ),
              DO_REFRESH,
              checkUpdateByStringify
          ).pipe(
              flatMap(ids => {
                    const playlist$Array = (ids || []).map(m => this.store.get<Playlist>(
                        getPlaylistKey(m),
                        DO_NOT_PREFETCH,
                        DO_NOT_REFRESH,
                        skipUpdateCheck
                    ));
                    return combineLatest0(playlist$Array).pipe(keepDefined);
                  }
              ),
              map(array => array.filter(defined) as Playlist[]),
          ) as Observable<Playlist[]>;
        }));
  }

  async createPlaylist(createPlaylistRequest: CreatePlaylistRequest): Promise<void> {
    const response = await this.httpClient.post<CreatePlaylistResponse>(`/api/playlist/create`, createPlaylistRequest).pipe(take(1)).toPromise();
    await this.cachePlaylists(response);
  }

  async updatePlaylist(playlist: Playlist): Promise<void> {
    const response = await this.httpClient.put<UpdatePlaylistResponse>(`/api/playlist/update`, playlist).pipe(take(1)).toPromise();
    await this.cachePlaylists(response);
  }

  async deleteUserPlaylist(playlistId: string): Promise<void> {
    const response = await this.httpClient.delete<DeletePlaylistResponse>(`/api/playlist/delete/${playlistId}`).pipe(take(1)).toPromise();
    await this.cachePlaylists(response);
  }

  /** Caches playlists in browser store. */
  async cachePlaylists(playlists: readonly Playlist[]): Promise<void> {
    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set(USER_PLAYLISTS_KEY, playlists.map(p => p.id), checkUpdateByShallowArrayCompare));
    for (const playlist of playlists) {
      allOps.push(this.store.set(getPlaylistKey(playlist.id)!, playlist, checkUpdateByVersion));
    }
    await Promise.all(allOps);
  }

  getPlaylist(playlistId?: string): Observable<Playlist|undefined> {
    const playlistKey = getPlaylistKey(playlistId);
    return this.store.get<Playlist>(
        playlistKey,
        () => this.httpClient.get<Playlist|undefined>(`/api/playlist/by-id/${playlistId}`),
        DO_REFRESH,
        checkUpdateByVersion
    );
  }

  getUser(): Observable<User|undefined> {
    return this.store.get<User>(USER_KEY, DO_NOT_PREFETCH, DO_NOT_REFRESH, skipUpdateCheck);
  }

  async setUser(user?: User): Promise<void> {
    if (!user) {
      // await this.store.clear();
    } else {
      // const currentUser = await this.store.get<User>(USER_KEY).pipe(take(1)).toPromise();
      // if (currentUser && currentUser.id !== user.id) {
      // await this.store.clear();
      // }
    }
    await this.store.set(USER_KEY, user, checkUpdateByStringify);
  }
}

function getUserSongSettingsKey(songId: number|string): string {
  return SONG_SETTINGS_KEY_PREFIX + songId;
}

function getPlaylistKey(playlistId?: string): string|undefined {
  return isValidPlaylistId(playlistId) ? PLAYLIST_PREFIX_KEY + playlistId : undefined;
}

function isValidPlaylistId(playlistId?: unknown): playlistId is string {
  return typeof playlistId === 'string' && playlistId.length >= 6;
}
