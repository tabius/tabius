import { ApplicationRef, Inject, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { first } from 'rxjs/operators';
import { APP_BROWSER_STORE_TOKEN } from '@app/app-constants';
import { DO_NOT_PREFETCH, ObservableStore, RefreshMode, skipUpdateCheck } from '@app/store';
import { concat, firstValueFrom, interval } from 'rxjs';

const LAST_FORCED_UPDATE_TIME_KEY = 'last-forced-update-time';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdaterService {
  constructor(appRef: ApplicationRef, updates: SwUpdate, @Inject(APP_BROWSER_STORE_TOKEN) appStore: ObservableStore) {
    if (!updates.isEnabled) {
      return;
    }

    // Allow the app to stabilize first.
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable));
    const oncePerDay$ = interval(24 * 60 * 60 * 1000);
    const oncePerDayWhenAppIsStable$ = concat(appIsStable$, oncePerDay$);

    oncePerDayWhenAppIsStable$.subscribe(() => {
      console.debug(`Checking for updates [${updates.isEnabled}]…`);
      updates.checkForUpdate().catch(err => console.error(err));
    });

    updates.versionUpdates.subscribe(async event => {
      if (event.type === 'NO_NEW_VERSION_DETECTED') {
        return;
      }
      console.debug('Found new app update: ', event);
      // Ensure we have no reload loop for whatever reason it may happen
      const lastForcedUpdateTime = await firstValueFrom(
        appStore.get<number>(LAST_FORCED_UPDATE_TIME_KEY, DO_NOT_PREFETCH, RefreshMode.DoNotRefresh, skipUpdateCheck),
      );
      const now = Date.now();
      if (!(lastForcedUpdateTime === undefined || lastForcedUpdateTime < now - 60_000)) {
        console.info(`Ignoring update, time since last forced update: ${now - lastForcedUpdateTime}ms`);
        return;
      }
      console.info('Enforcing app update');
      await appStore.set(LAST_FORCED_UPDATE_TIME_KEY, now, skipUpdateCheck);
      await updates.activateUpdate();
      document.location.reload();
    });
  }
}
