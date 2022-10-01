import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, from, Observable, of} from 'rxjs';
import {CatalogNavigationHistory, CatalogNavigationHistoryStep, DEFAULT_FAVORITE_KEY, DEFAULT_H4SI_FLAG, newDefaultUserDeviceSettings, newDefaultUserSettings, newDefaultUserSongSettings, newEmptyCatalogNavigationHistory, User, UserDeviceSettings, UserSettings, UserSongSettings} from '@common/user-model';
import {checkUpdateByReference, checkUpdateByStringify, DO_NOT_PREFETCH, ObservableStore, RefreshMode, skipUpdateCheck} from '@app/store';
import {map, mergeMap, switchMap} from 'rxjs/operators';
import {TABIUS_USER_BROWSER_STORE_TOKEN} from '@app/app-constants';
import {isEqualByStringify, isValidId} from '@common/util/misc-utils';
import {ChordTone} from '@app/utils/chords-lib';
import {LoginResponse, UpdateFavoriteSongKeyRequest} from '@common/ajax-model';
import {ClientAuthService} from '@app/services/client-auth.service';

const DEVICE_SETTINGS_KEY = 'device-settings';
const USER_SETTINGS_FETCH_DATE_KEY = 'user-settings-fetch-date';
const SONG_SETTINGS_KEY_PREFIX = 'ss-';
const H4SI_FLAG_KEY = 'h4Si';
const FAVORITE_TONE_KEY = 'favoriteKey';
const USER_KEY = 'user';
const MAX_STEPS_IN_CATALOG_NAVIGATION_HISTORY = 15;

const CATALOG_NAVIGATION_HISTORY_KEY = 'catalog-navigation-history';
export const UPDATE_SIGN_IN_STATE_URL = '/api/user/login';

/** Client-side API to access/update personal user settings. */
@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private readonly httpClient: HttpClient,
              authService: ClientAuthService,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly store: ObservableStore,
  ) {
    authService.user$.subscribe(async (user) => {
      if (user) {
        try {
          const {user, settings} = await firstValueFrom(this.httpClient.get<LoginResponse>(UPDATE_SIGN_IN_STATE_URL));
          if (user) {
            await this.setUserOnSignIn(user);
            await this.updateUserSettings(settings);
          } else {
            await this.resetStoreStateOnSignOut();
          }
        } catch (e) {
          console.warn(e);
        }
      } else {
        await this.resetStoreStateOnSignOut();
      }
    });
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
                return this.fetchAndUpdateUserSettings(user).pipe(
                    map(userSettings => userSettings.songs[songId] || newDefaultUserSongSettings(songId))
                );
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
            mergeMap(userSettings => from(this.updateUserSettings(userSettings))
                .pipe(map(() => userSettings)))
        );
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    // if settings are the same: do not store it at all. This is implicit contract with a server.
    const processedSettings = isEqualByStringify(songSettings, newDefaultUserSongSettings(songSettings.songId)) ? undefined : songSettings;
    await this.store.set<UserSongSettings>(key, processedSettings, checkUpdateByStringify);

    // update settings on the server only if we have valid user session.
    const userSettingsFromServer = await firstValueFrom(
        this.getUser().pipe(
            mergeMap(user => user
                             ? this.httpClient.put<UserSettings>(`/api/user/settings/song`, songSettings)
                             : of(undefined)))
    );
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
    const settings = await firstValueFrom(this.httpClient.put<UserSettings>(`/api/user/settings/h4si`, {h4SiFlag: h4SiFlag}));
    await this.updateUserSettings(settings);
  }

  getFavoriteKey(refreshMode: RefreshMode = RefreshMode.DoNotRefresh): Observable<ChordTone> {
    return this.getUser().pipe(
        switchMap(user => {
          if (!user) {
            return of(DEFAULT_FAVORITE_KEY);
          }
          return this.store.get<ChordTone>(
              FAVORITE_TONE_KEY,
              () => this.fetchAndUpdateUserSettings(user).pipe(map(userSettings => userSettings.favKey)),
              refreshMode,
              checkUpdateByReference
          ).pipe(map(key => key || DEFAULT_FAVORITE_KEY));
        })
    );
  }

  async setFavoriteKey(favKey: ChordTone): Promise<void> {
    await this.store.set<string>(FAVORITE_TONE_KEY, favKey, skipUpdateCheck);
    const updateRequest: UpdateFavoriteSongKeyRequest = {key: favKey};
    const settings = await firstValueFrom(this.httpClient.put<UserSettings>(`/api/user/settings/favKey`, updateRequest));
    await this.updateUserSettings(settings);
  }

  /** Used to dedupe updates triggered by the same de-multiplexed fetch call.*/
  private lastUpdatedSettings?: UserSettings;

  async updateUserSettings(userSettings: UserSettings): Promise<void> {
    if (this.lastUpdatedSettings === userSettings) {
      return;
    }
    this.lastUpdatedSettings = userSettings;
    const oldSongSettings = await this.store.snapshot<UserSongSettings>(SONG_SETTINGS_KEY_PREFIX);

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

  async setUserOnSignIn(user: User): Promise<void> {
    const oldUser = await firstValueFrom(this.store.get<User>(USER_KEY, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    if (oldUser && oldUser.id !== user.id) {
      await this.resetStoreStateOnSignOut();
    }
    await this.store.set<User>(USER_KEY, user, checkUpdateByStringify);
  }

  async resetStoreStateOnSignOut(): Promise<void> {
    const user = await firstValueFrom(this.store.get<User>(USER_KEY, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    if (!user) { // already signed out
      return;
    }
    console.debug('Cleaning up user data on sign-out: ', user);
    await this.store.remove(USER_KEY);
    await this.updateUserSettings(newDefaultUserSettings());
    await this.setCatalogNavigationHistory(newEmptyCatalogNavigationHistory());
  }

  getCatalogNavigationHistory(): Observable<CatalogNavigationHistory> {
    return this.store.get<CatalogNavigationHistory>(
        CATALOG_NAVIGATION_HISTORY_KEY,
        DO_NOT_PREFETCH,
        RefreshMode.DoNotRefresh,
        skipUpdateCheck
    ).pipe(map(s => s || newEmptyCatalogNavigationHistory()));
  }

  async setCatalogNavigationHistory(history: CatalogNavigationHistory): Promise<void> {
    await this.store.set<CatalogNavigationHistory>(CATALOG_NAVIGATION_HISTORY_KEY, history, checkUpdateByStringify);
  }

  async removeStepFromCatalogNavigationHistory(url: string): Promise<void> {
    const history = {...await firstValueFrom(this.getCatalogNavigationHistory())};
    history.steps = history.steps.filter(s => s.url !== url);
    await this.setCatalogNavigationHistory(history);
  }

  async addCatalogNavigationHistoryStep(step: CatalogNavigationHistoryStep|undefined): Promise<void> {
    if (!step) {
      return;
    }
    await this.removeStepFromCatalogNavigationHistory(step.url);
    const history = {...await firstValueFrom(this.getCatalogNavigationHistory())};
    if (history.steps.length >= MAX_STEPS_IN_CATALOG_NAVIGATION_HISTORY) {
      history.steps.splice(history.steps.length - MAX_STEPS_IN_CATALOG_NAVIGATION_HISTORY + 1);
    }
    history.steps.push(step);
    await this.setCatalogNavigationHistory(history);
  }
}

function getUserSongSettingsKey(songId: number|undefined): string|undefined {
  return isValidId(songId) ? SONG_SETTINGS_KEY_PREFIX + songId : undefined;
}
