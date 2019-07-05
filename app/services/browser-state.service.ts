import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {BehaviorSubject, Observable} from 'rxjs';
import {ToastService} from '@app/toast/toast.service';
import {skip} from 'rxjs/operators';
import * as NoSleep from 'nosleep.js/dist/NoSleep';

@Injectable({
  providedIn: 'root'
})
export class BrowserStateService {

  readonly isBrowser;

  private readonly noSleep = new NoSleep();

  private readonly noSleepMode$ = new BehaviorSubject<boolean>(false);

  constructor(
      @Inject(PLATFORM_ID) readonly platformId: Object,
      toaster: ToastService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.noSleepMode$.pipe(skip(1)).subscribe(mode => {
      const msg = mode
          ? 'Включена блокировка сна.\nТеперь экран будет всегда включён.'
          : 'Блокировка сна отключена.\nИспользуется режим по умолчанию.';
      toaster.show(msg, 'info');
    });
  }

  /** Returns true if the app is online or on the server side. Returns false only if the app is in browser and offline. */
  isOnline(): boolean {
    return !this.isBrowser || (!navigator || navigator.onLine === undefined || navigator.onLine);
  }

  getNoSleepMode$(): Observable<boolean> {
    return this.noSleepMode$;
  }

  toggleNoSleepMode(): void {
    if (!this.isBrowser) {
      return;
    }
    const nextState = !this.noSleepMode$.getValue();
    if (nextState) {
      this.noSleep.enable();
    } else {
      this.noSleep.disable();
    }
    this.noSleepMode$.next(nextState);
  }

}
