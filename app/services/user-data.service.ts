import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest, Observable, of} from 'rxjs';
import {newDefaultUserDeviceSettings, newDefaultUserSongSettings, Playlist, User, UserDeviceSettings, UserSettings, UserSongSettings} from '@common/user-model';
import {BrowserStore} from '@app/store/browser-store';
import {flatMap, map, switchMap, tap} from 'rxjs/operators';
import {TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {defined, isValidId, keepDefined, needUpdateByShallowArrayCompare, needUpdateByStringify, needUpdateByVersionChange} from '@common/util/misc-utils';
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
    return this.store.get<UserDeviceSettings>(DEVICE_SETTINGS_KEY)
        .pipe(map(s => s || newDefaultUserDeviceSettings()));
  }

  async setUserDeviceSettings(userDeviceSettings: UserDeviceSettings): Promise<void> {
    await this.store.set(DEVICE_SETTINGS_KEY, userDeviceSettings, needUpdateByStringify);
  }

  getUserSongSettings(songId?: number): Observable<UserSongSettings> {
    if (!isValidId(songId)) {
      return of(newDefaultUserSongSettings(0));
    }
    return this.getUser().pipe(
        switchMap(() => {
          return this.store.get<UserSongSettings>(getUserSongSettingsKey(songId),
              () => this.fetchAndProcessUserSettings().pipe(map(userSettings => userSettings.songs[songId])), true)
              .pipe(map(songSettings => songSettings || newDefaultUserSongSettings(songId)));
        }));
  }

  private fetchAndProcessUserSettings(): Observable<UserSettings> {
    return this.httpClient.get<UserSettings>(`/api/user/settings`)
        .pipe(tap(userSettings => this.updateUserSettingsOnFetch(userSettings)));
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    await this.store.set(key, songSettings, needUpdateByStringify);
    const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/song`, songSettings).toPromise();
    await this.updateUserSettingsOnFetch(settings);
  }

  getB4SiFlag(): Observable<boolean> {
    return this.getUser().pipe(
        switchMap(() => {
          return this.store.get<boolean>(B4SI_FLAG_KEY, () => this.fetchAndProcessUserSettings().pipe(map(userSettings => userSettings.b4Si)), true)
              .pipe(map(flag => flag === undefined ? false : flag));
        })
    );
  }

  async setB4SiFlag(b4SiFlag: boolean): Promise<void> {
    await this.store.set(B4SI_FLAG_KEY, b4SiFlag || undefined); //todo: need update?
    const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/b4si`, {b4SiFlag: b4SiFlag}).toPromise();
    await this.updateUserSettingsOnFetch(settings);
  }

  async updateUserSettingsOnFetch(userSettings: UserSettings): Promise<void> {
    const oldSongSettings = await this.store.list<UserSongSettings>(SONG_SETTINGS_KEY_PREFIX);

    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set(USER_SETTINGS_FETCH_DATE_KEY, Date.now()));
    const updatedKeys = new Set<string>();
    for (const songId in userSettings.songs) {
      const songSettings = userSettings.songs[songId];
      const key = getUserSongSettingsKey(songSettings.songId);
      updatedKeys.add(key);
      allOps.push(this.store.set(key, songSettings, needUpdateByStringify));
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
        switchMap(() => {
          return this.store.get<string[]>(USER_PLAYLISTS_KEY, () => {
            return this.httpClient.get<Playlist[]>(`/api/playlist/by-current-user`)
                .pipe(
                    tap(playlists => this.cachePlaylists(playlists)),
                    map(playlists => playlists ? playlists.map(p => p.id) : []),
                );
          }, true)
              .pipe(
                  flatMap(ids => {
                        const playlist$Array = (ids || []).map(m => this.store.get<Playlist>(getPlaylistKey(m)));
                        return playlist$Array.length > 0 ? combineLatest(playlist$Array).pipe(keepDefined) : of([]);
                      }
                  ),
                  map(array => array.filter(defined) as Playlist[]),
              ) as Observable<Playlist[]>;
        }));
  }

  async createPlaylist(createPlaylistRequest: CreatePlaylistRequest): Promise<void> {
    const response = await this.httpClient.post<CreatePlaylistResponse>(`/api/playlist/create`, createPlaylistRequest).toPromise();
    await this.cachePlaylists(response);
  }

  async updatePlaylist(playlist: Playlist): Promise<void> {
    const response = await this.httpClient.put<UpdatePlaylistResponse>(`/api/playlist/update`, playlist).toPromise();
    await this.cachePlaylists(response);
  }

  async deleteUserPlaylist(playlistId: string): Promise<void> {
    const response = await this.httpClient.delete<DeletePlaylistResponse>(`/api/playlist/delete/${playlistId}`).toPromise();
    await this.cachePlaylists(response);
  }

  /** Caches playlists in browser store. */
  async cachePlaylists(playlists: readonly Playlist[]): Promise<void> {
    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set(USER_PLAYLISTS_KEY, playlists.map(p => p.id), needUpdateByShallowArrayCompare));
    for (const playlist of playlists) {
      allOps.push(this.store.set(getPlaylistKey(playlist.id)!, playlist, needUpdateByVersionChange));
    }
    await Promise.all(allOps);
  }

  getPlaylist(playlistId?: string): Observable<Playlist|undefined> {
    const playlistKey = getPlaylistKey(playlistId);
    return this.store.get<Playlist>(playlistKey, () => this.httpClient.get<Playlist|undefined>(`/api/playlist/by-id/${playlistId}`), true);
  }

  getUser(): Observable<User|undefined> {
    return this.store.get<User>(USER_KEY);
  }

  async setUser(user?: User): Promise<void> {
    if (!user) {
      await this.store.clear();
    } else {
      await this.store.set(USER_KEY, user, needUpdateByStringify);
    }
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
