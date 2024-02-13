import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, from, Observable, of } from 'rxjs';
import {
  CatalogNavigationHistory,
  CatalogNavigationHistoryStep,
  DEFAULT_FAVORITE_KEY,
  newDefaultUserSettings,
  newDefaultUserSongSettings,
  newEmptyCatalogNavigationHistory,
  User,
  UserDeviceSettings,
  UserSettings,
  UserSongSettings,
} from '@common/user-model';
import {
  checkUpdateByReference,
  checkUpdateByStringify,
  DO_NOT_PREFETCH,
  FetchFn,
  LocalStorageAsyncStore,
  ObservableStore,
  RefreshMode,
  skipUpdateCheck,
} from '@app/store';
import { map, switchMap, take } from 'rxjs/operators';
import { TABIUS_USER_BROWSER_STORE_TOKEN } from '@app/app-constants';
import { isNumericId } from '@common/util/misc-utils';
import { ChordTone } from '@common/util/chords-lib';
import { LoginResponse, UpdateFavoriteSongKeyRequest } from '@common/api-model';
import { ClientAuthService } from '@app/services/client-auth.service';
import { TrieStore } from 'otrie';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { isEqualByStringify } from '@common/util/equality-functions';
import { newDefaultUserDeviceSettings } from '@app/utils/misc-utils';

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
  providedIn: 'root',
})
export class UserService {
  private readonly userDeviceSettingsTrieStore = new TrieStore<UserDeviceSettings>(newDefaultUserDeviceSettings());
  private readonly userDeviceSettingsPersistentStore =
    typeof window === 'undefined' ? undefined : new LocalStorageAsyncStore(DEVICE_SETTINGS_KEY);

  constructor(
    private readonly httpClient: HttpClient,
    authService: ClientAuthService,
    @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly store: ObservableStore,
  ) {
    authService.user$.subscribe(async user => {
      if (user) {
        try {
          const { user, settings } = await firstValueFrom(this.httpClient.get<LoginResponse>(UPDATE_SIGN_IN_STATE_URL));
          if (user) {
            await this.setUserOnSignIn(user);
            await this.updateUserSettings(settings);
          } else {
            await this.resetStoreStateOnSignOut();
          }
        } catch (e) {
          console.error('UserService error processing sign in event', e);
        }
      } else {
        await this.resetStoreStateOnSignOut();
      }
    });

    const persistentStore = this.userDeviceSettingsPersistentStore;
    if (persistentStore) {
      let lastValueFromPersistentStore: unknown;
      fromPromise(persistentStore.get('value'))
        .pipe(
          take(1),
          switchMap(value => {
            if (value && typeof value === 'object') {
              this.userDeviceSettingsTrieStore.set([], value);
              lastValueFromPersistentStore = value;
            }
            return this.userDeviceSettingsTrieStore.state$;
          }),
        )
        .subscribe(async value => {
          if (value !== lastValueFromPersistentStore) {
            await persistentStore.set('value', value);
          }
        });
      persistentStore.observe<UserDeviceSettings>().subscribe(e => {
        console.debug('Got user settings update in another tab. Applying the update to the current tab');
        this.userDeviceSettingsTrieStore.set([], e.value);
      });
    }
  }

  userDeviceSettings$(): Observable<UserDeviceSettings> {
    return this.userDeviceSettingsTrieStore.state$;
  }

  async setUserDeviceSettings(userDeviceSettings: UserDeviceSettings): Promise<void> {
    this.userDeviceSettingsTrieStore.set([], userDeviceSettings);
  }

  getUserSongSettings(songId: number | undefined): Observable<UserSongSettings> {
    if (!isNumericId(songId)) {
      return of(newDefaultUserSongSettings(0));
    }
    return this.getUser$().pipe(
      switchMap(user =>
        this.store
          .get<UserSongSettings>(
            getUserSongSettingsKey(songId),
            () => {
              // fetch function.
              if (user) {
                return this.fetchAndUpdateUserSettings(user).pipe(
                  map(userSettings => userSettings.songs[songId] || newDefaultUserSongSettings(songId)),
                );
              } else {
                return of(newDefaultUserSongSettings(songId));
              }
            },
            RefreshMode.DoNotRefresh, // refreshed on every login as a part of login response or on every song settings update.
            checkUpdateByStringify,
          )
          .pipe(map(songSettings => songSettings || newDefaultUserSongSettings(songId))),
      ),
    );
  }

  private fetchAndUpdateUserSettings(user: User | undefined): Observable<UserSettings> {
    if (!user) {
      return of(newDefaultUserSettings());
    }
    return this.httpClient
      .get<UserSettings>(`/api/user/settings`)
      .pipe(switchMap(userSettings => from(this.updateUserSettings(userSettings)).pipe(map(() => userSettings))));
  }

  async setUserSongSettings(songSettings: UserSongSettings): Promise<void> {
    const key = getUserSongSettingsKey(songSettings.songId);
    // If settings are the same: do not store it at all. This is an implicit contract with a server.
    const processedSettings = isEqualByStringify(songSettings, newDefaultUserSongSettings(songSettings.songId))
      ? undefined
      : songSettings;
    await this.store.set<UserSongSettings>(key, processedSettings, checkUpdateByStringify);

    // update settings on the server only if we have a valid user session.
    const userSettingsFromServer = await firstValueFrom(
      this.getUser$().pipe(
        switchMap(user => (user ? this.httpClient.put<UserSettings>(`/api/user/settings/song`, songSettings) : of(undefined))),
      ),
    );
    if (userSettingsFromServer) {
      await this.updateUserSettings(userSettingsFromServer);
    }
  }

  /**
   * Note: using a custom refresh option to allow forced refresh.
   */
  getH4SiFlag(refreshMode: RefreshMode = RefreshMode.DoNotRefresh): Observable<boolean> {
    return this.getUser$().pipe(
      switchMap(user => {
        const fetchFn: FetchFn<boolean> | undefined = user
          ? () => this.fetchAndUpdateUserSettings(user).pipe(map(userSettings => userSettings.h4Si))
          : undefined;
        return this.store
          .get<boolean>(H4SI_FLAG_KEY, fetchFn, user ? refreshMode : RefreshMode.DoNotRefresh, checkUpdateByReference)
          .pipe(map(flag => !!flag));
      }),
    );
  }

  async setH4SiFlag(h4SiFlag: boolean): Promise<void> {
    await this.store.set<boolean>(H4SI_FLAG_KEY, h4SiFlag, skipUpdateCheck);
    const isSignedIn = !!(await this.getCurrentUser());
    if (isSignedIn) {
      const settings = await firstValueFrom(this.httpClient.put<UserSettings>(`/api/user/settings/h4si`, { h4SiFlag: h4SiFlag }));
      await this.updateUserSettings(settings);
    }
  }

  getFavoriteKey(refreshMode: RefreshMode = RefreshMode.DoNotRefresh): Observable<ChordTone> {
    return this.getUser$().pipe(
      switchMap(user => {
        const fetchFn: FetchFn<ChordTone> | undefined = user
          ? () => this.fetchAndUpdateUserSettings(user).pipe(map(userSettings => userSettings.favKey))
          : undefined;
        return this.store
          .get<ChordTone>(FAVORITE_TONE_KEY, fetchFn, user ? refreshMode : RefreshMode.DoNotRefresh, checkUpdateByReference)
          .pipe(map(key => key || DEFAULT_FAVORITE_KEY));
      }),
    );
  }

  async setFavoriteKey(favKey: ChordTone): Promise<void> {
    await this.store.set<string>(FAVORITE_TONE_KEY, favKey, skipUpdateCheck);
    const isSignedIn = !!(await this.getCurrentUser());
    if (isSignedIn) {
      const updateRequest: UpdateFavoriteSongKeyRequest = { key: favKey };
      const settings = await firstValueFrom(this.httpClient.put<UserSettings>(`/api/user/settings/favKey`, updateRequest));
      await this.updateUserSettings(settings);
    }
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

  getUser$(): Observable<User | undefined> {
    return this.store.get<User>(USER_KEY, DO_NOT_PREFETCH, RefreshMode.DoNotRefresh, skipUpdateCheck);
  }

  async getCurrentUser(): Promise<User | undefined> {
    return firstValueFrom(this.store.get<User>(USER_KEY, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
  }

  async setUserOnSignIn(user: User): Promise<void> {
    const oldUser = await firstValueFrom(this.store.get<User>(USER_KEY, undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    if (oldUser && oldUser.id !== user.id) {
      await this.resetStoreStateOnSignOut();
    }
    await this.store.set<User>(USER_KEY, user, checkUpdateByStringify);
  }

  async resetStoreStateOnSignOut(): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) {
      // already signed out
      return;
    }
    console.debug('Cleaning up user data on sign-out: ', user);
    await this.store.remove(USER_KEY);
    await this.updateUserSettings(newDefaultUserSettings());
    await this.setCatalogNavigationHistory(newEmptyCatalogNavigationHistory());
  }

  getCatalogNavigationHistory(): Observable<CatalogNavigationHistory> {
    return this.store
      .get<CatalogNavigationHistory>(CATALOG_NAVIGATION_HISTORY_KEY, DO_NOT_PREFETCH, RefreshMode.DoNotRefresh, skipUpdateCheck)
      .pipe(map(s => s || newEmptyCatalogNavigationHistory()));
  }

  async setCatalogNavigationHistory(history: CatalogNavigationHistory): Promise<void> {
    await this.store.set<CatalogNavigationHistory>(CATALOG_NAVIGATION_HISTORY_KEY, history, checkUpdateByStringify);
  }

  async removeStepFromCatalogNavigationHistory(url: string): Promise<void> {
    const history = { ...(await firstValueFrom(this.getCatalogNavigationHistory())) };
    history.steps = history.steps.filter(s => s.url !== url);
    await this.setCatalogNavigationHistory(history);
  }

  async addCatalogNavigationHistoryStep(step: CatalogNavigationHistoryStep | undefined): Promise<void> {
    if (!step) {
      return;
    }
    await this.removeStepFromCatalogNavigationHistory(step.url);
    const history = { ...(await firstValueFrom(this.getCatalogNavigationHistory())) };
    if (history.steps.length >= MAX_STEPS_IN_CATALOG_NAVIGATION_HISTORY) {
      history.steps.splice(history.steps.length - MAX_STEPS_IN_CATALOG_NAVIGATION_HISTORY + 1);
    }
    history.steps.push(step);
    await this.setCatalogNavigationHistory(history);
  }
}

function getUserSongSettingsKey(songId: number | undefined): string | undefined {
  return isNumericId(songId) ? SONG_SETTINGS_KEY_PREFIX + songId : undefined;
}
