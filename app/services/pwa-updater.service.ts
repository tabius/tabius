import {ApplicationRef, Inject, Injectable} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';
import {first, take} from 'rxjs/operators';
import {APP_BROWSER_STORE_TOKEN} from '@common/constants';
import {BrowserStore} from '@app/store/browser-store';

const LAST_FORCED_UPDATE_TIME_KEY = 'last-forced-update-time';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdaterService {

  constructor(appRef: ApplicationRef,
              updates: SwUpdate,
              @Inject(APP_BROWSER_STORE_TOKEN) appStore: BrowserStore) {
    if (!updates.isEnabled) {
      return;
    }

    // Allow the app to stabilize first.
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable));
    appIsStable$.subscribe(() => {
      console.debug('Checking for updates…');
      updates.checkForUpdate().catch(err => console.error(err));
    });

    updates.available.subscribe(event => {
      console.debug('Found new app update!', event);
      // ensure we have no reload loop for whatever reason it may happen
      appStore.get<number>(LAST_FORCED_UPDATE_TIME_KEY).pipe(take(1)).subscribe(lastForcedUpdateTime => {
        const now = Date.now();
        if (lastForcedUpdateTime === undefined || lastForcedUpdateTime < now - 60_000) {
          console.info('Enforcing app updated!');
          appStore.set(LAST_FORCED_UPDATE_TIME_KEY, now).then(() => document.location.reload());
        } else {
          console.info(`Ignoring update, time since last forced update: ${now - lastForcedUpdateTime}ms`);
        }
      });
    });
  }
}

