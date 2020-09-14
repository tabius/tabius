import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {DEFAULT_FAVORITE_KEY, DEFAULT_H4SI_FLAG, newDefaultUserDeviceSettings, newDefaultUserSettings, newDefaultUserSongSettings, User, UserDeviceSettings, UserSettings, UserSongSettings} from '@common/user-model';
import {DO_NOT_PREFETCH, ObservableStore, RefreshMode, skipUpdateCheck} from '@app/store/observable-store';
import {map, mergeMap, switchMap, take} from 'rxjs/operators';
import {TABIUS_USER_BROWSER_STORE_TOKEN} from '@app/app-constants';
import {isEqualByStringify, isValidId} from '@common/util/misc-utils';
import {fromPromise} from 'rxjs/internal-compatibility';
import {checkUpdateByReference, checkUpdateByStringify} from '@app/store/check-update-functions';
import {ChordTone} from '@app/utils/chords-lib';
import {UpdateFavoriteSongKeyRequest} from '@common/ajax-model';

const DEVICE_SETTINGS_KEY = 'device-settings';
const USER_SETTINGS_FETCH_DATE_KEY = 'user-settings-fetch-date';
const SONG_SETTINGS_KEY_PREFIX = 'ss-';
const H4SI_FLAG_KEY = 'h4Si';
const FAV_SONG_KEY_KEY = 'favKey';
const USER_KEY = 'user';

/** Client-side API to access/update personal user settings. */
@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private readonly httpClient: HttpClient,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly store: ObservableStore,
  ) {
  }

  getUserDeviceSettings(): Observable<UserDeviceSettings> {
    return this.store.get<UserDeviceSettings>(
        DEVICE_SETTINGS_KEY,
        DO_NOT_PREFETCH,
        RefreshMode.DoNotRefresh,
        skipUpdateCheck
    ).pipe(map(s => s || newDefaultUserDeviceSettings()));
  }

  async setUserDeviceSettings(userDeviceSettings: UserDeviceSettings): Promise<void> {
    await this.store.set<UserDeviceSettings>(DEVICE_SETTINGS_KEY, userDeviceSettings, checkUpdateByStringify);
  }

  getUserSongSettings(songId: number|undefined): Observable<UserSongSettings> {
    if (!isValidId(songId)) {
      return of(newDefaultUserSongSettings(0));
    }
    return this.getUser().pipe(
        switchMap(user => this.store.get<UserSongSettings>(
            getUserSongSettingsKey(songId),
            () => { // fetch function.
              if (user) {
                return this.fetchAndUpdateUserSettings(user).pipe(map(userSettings => userSettings.songs[songId]));
              } else {
                return of(newDefaultUserSongSettings(songId));
              }
            },
            RefreshMode.DoNotRefresh, // refreshed on every login as a part of login response or on every song settings update.
            checkUpdateByStringify
        ).pipe(map(songSettings => songSettings || newDefaultUserSongSettings(songId)))));
  }

  private fetchAndUpdateUserSettings(user: User|undefined): Observable<UserSettings> {
    if (!user) {
      return of(newDefaultUserSettings());
    }
    return this.httpClient.get<UserSettings>(`/api/user/settings`)
        .pipe(
            mergeMap(userSettings => fromPromise(this.updateUserSettings(userSettings))
                .pipe(map(() => userSettings)))
        );
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    // if settings are the same: do not store it at all. This is implicit contract with a server.
    const processedSettings = isEqualByStringify(songSettings, newDefaultUserSongSettings(songSettings.songId)) ? undefined : songSettings;
    await this.store.set<UserSongSettings>(key, processedSettings, checkUpdateByStringify);

    // update settings on the server only if we have valid user session.
    const userSettingsFromServer = await this.getUser().pipe(
        mergeMap(user => user ? this.httpClient.put<UserSettings>(`/api/user/settings/song`, songSettings) : of(undefined)),
        take(1)
    ).toPromise();
    if (userSettingsFromServer) {
      await this.updateUserSettings(userSettingsFromServer);
    }
  }

  /**
   * Note: using custom refresh option to allow forced refresh.
   */
  getH4SiFlag(refreshMode: RefreshMode = RefreshMode.DoNotRefresh): Observable<boolean> {
    return this.getUser().pipe(
        switchMap(user => {
          if (!user) {
            return of(DEFAULT_H4SI_FLAG);
          }
          return this.store.get<boolean>(
              H4SI_FLAG_KEY,
              () => this.fetchAndUpdateUserSettings(user).pipe(map(userSettings => userSettings.h4Si)),
              refreshMode,
              checkUpdateByReference
          ).pipe(map(flag => !!flag));
        })
    );
  }

  async setH4SiFlag(h4SiFlag: boolean): Promise<void> {
    await this.store.set<boolean>(H4SI_FLAG_KEY, h4SiFlag, skipUpdateCheck);
    const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/h4si`, {h4SiFlag: h4SiFlag}).pipe(take(1)).toPromise();
    await this.updateUserSettings(settings);
  }

  getFavoriteSongKey(refreshMode: RefreshMode = RefreshMode.DoNotRefresh): Observable<ChordTone> {
    return this.getUser().pipe(
        switchMap(user => {
          if (!user) {
            return of(DEFAULT_FAVORITE_KEY);
          }
          return this.store.get<ChordTone>(
              FAV_SONG_KEY_KEY,
              () => this.fetchAndUpdateUserSettings(user).pipe(map(userSettings => userSettings.favKey)),
              refreshMode,
              checkUpdateByReference
          ).pipe(map(key => key || DEFAULT_FAVORITE_KEY));
        })
    );
  }

  async setFavoriteSongKey(favKey: ChordTone): Promise<void> {
    await this.store.set<string>(FAV_SONG_KEY_KEY, favKey, skipUpdateCheck);
    const updateRequest: UpdateFavoriteSongKeyRequest = {key: favKey};
    const settings = await this.httpClient.put<UserSettings>(`/api/user/settings/favKey`, updateRequest)
        .pipe(take(1)).toPromise();
    await this.updateUserSettings(settings);
  }

  /** Used to dedup updates triggered by the same de-multiplexed fetch call.*/
  private lastUpdatedSettings?: UserSettings;

  async updateUserSettings(userSettings: UserSettings): Promise<void> {
    if (this.lastUpdatedSettings === userSettings) {
      return;
    }
    this.lastUpdatedSettings = userSettings;
    const oldSongSettings = await this.store.list<UserSongSettings>(SONG_SETTINGS_KEY_PREFIX);

    const allOps: Promise<void>[] = [];
    allOps.push(this.store.set<number>(USER_SETTINGS_FETCH_DATE_KEY, Date.now(), skipUpdateCheck));
    const updatedKeys = new Set<string>();
    for (const songId in userSettings.songs) {
      const songSettings = userSettings.songs[songId];
      const key = getUserSongSettingsKey(songSettings.songId);
      if (key) {
        updatedKeys.add(key);
        allOps.push(this.store.set<UserSongSettings>(key, songSettings, checkUpdateByStringify));
      }
    }

    // delete missed settings.
    for (const oldSettingsEntry of oldSongSettings) {
      if (!updatedKeys.has(oldSettingsEntry.key)) {
        allOps.push(this.store.remove(oldSettingsEntry.key));
      }
    }

    allOps.push(this.store.set<boolean>(H4SI_FLAG_KEY, userSettings.h4Si || undefined, checkUpdateByReference));
    await Promise.all(allOps);
  }

  getUser(): Observable<User|undefined> {
    return this.store.get<User>(USER_KEY, DO_NOT_PREFETCH, RefreshMode.DoNotRefresh, skipUpdateCheck);
  }

  syncSessionStateAsync(): void {
    this.syncSessionState().catch(err => console.error(err));
  }

  async syncSessionState(): Promise<void> {
    await this.httpClient.get('/api/user/sync').pipe(take(1)).toPromise();
  }

  async setUserOnSignIn(user: User): Promise<void> {
    const oldUser = await this.store.get<User>(USER_KEY, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();
    if (oldUser && oldUser.id !== user.id) {
      await this.resetStoreStateOnSignOut();
    }
    await this.store.set<User>(USER_KEY, user, checkUpdateByStringify);
  }

  async resetStoreStateOnSignOut(): Promise<void> {
    const user = await this.store.get<User>(USER_KEY, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();
    if (!user) { // already signed out
      return;
    }
    console.debug('Cleaning up user data on sign-out: ', user);
    await this.store.remove(USER_KEY);
    await this.updateUserSettings(newDefaultUserSettings());
  }
}

function getUserSongSettingsKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_SETTINGS_KEY_PREFIX + songId : undefined;
}
