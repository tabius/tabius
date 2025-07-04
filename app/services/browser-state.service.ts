import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastService } from '@app/toast/toast.service';
import { map, skip } from 'rxjs/operators';
import * as NoSleep from 'nosleep.js/dist/NoSleep';
import { Router } from '@angular/router';
import { MOUNT_PRINT_SUFFIX } from '@common/mounts';
import { I18N } from '@app/app-i18n';
import { getUserAgentFromRequest, isSmallScreenDevice } from '@common/util/misc-utils';
import { MIN_DESKTOP_WIDTH } from '@common/common-constants';

@Injectable({
  providedIn: 'root',
})
export class BrowserStateService {
  readonly platformId = inject<Object>(PLATFORM_ID);

  readonly isBrowser: boolean;
  readonly isServer: boolean;

  private readonly i18n = I18N.browserStateService;

  private readonly noSleepMode$ = new BehaviorSubject<boolean>(false);

  private readonly printMode$ = new BehaviorSubject<boolean>(false);

  get isWideScreenMode$(): Observable<boolean> {
    return this.wideScreenMode$ as Observable<boolean>;
  }

  get isSmallScreenMode$(): Observable<boolean> {
    return this.isWideScreenMode$.pipe(map(flag => !flag));
  }

  get isWideScreenMode(): boolean {
    return this.wideScreenMode$.getValue();
  }

  get isSmallScreenMode(): boolean {
    return !this.isWideScreenMode;
  }

  private readonly wideScreenMode$ = new BehaviorSubject<boolean>(true);

  private noSleep?: NoSleep;

  constructor() {
    const platformId = this.platformId;
    const router = inject(Router);
    const toaster = inject(ToastService);

    this.isBrowser = isPlatformBrowser(platformId);
    this.isServer = !this.isBrowser;
    this.noSleepMode$.pipe(skip(1)).subscribe(mode => {
      const msg = mode ? this.i18n.noSleepModeIsOn : this.i18n.noSleepModeIsOff;
      toaster.show(msg, 'info');
    });

    router.events.subscribe(event => {
      const url = (event as any).url || '';
      if (url) {
        const printModeState = url.endsWith('/' + MOUNT_PRINT_SUFFIX);
        if (printModeState !== this.printMode$.getValue()) {
          this.printMode$.next(printModeState);
        }
      }
    });
  }

  /** Returns true if the app is online or on the server side. Returns false only if the app is in browser and offline. */
  isOnline(): boolean {
    return !this.isBrowser || !navigator || navigator.onLine === undefined || navigator.onLine;
  }

  getNoSleepMode$(): Observable<boolean> {
    return this.noSleepMode$;
  }

  toggleNoSleepMode(): void {
    if (!this.isBrowser) {
      return;
    }
    if (!this.noSleep) {
      this.noSleep = new NoSleep();
    }
    const nextState = !this.noSleepMode$.getValue();
    if (nextState) {
      this.noSleep.enable();
    } else {
      this.noSleep.disable();
    }
    this.noSleepMode$.next(nextState);
  }

  getPrintMode(): Observable<boolean> {
    return this.printMode$;
  }

  getUserAgentString(request: any): string | undefined {
    return this.isBrowser ? navigator && navigator.userAgent : getUserAgentFromRequest(request);
  }

  initWideScreenModeState(request?: any): void {
    if (this.isBrowser) {
      this.updateWideScreenModeFromWindow();
    } else {
      const userAgent = getUserAgentFromRequest(request);
      this.wideScreenMode$.next(!isSmallScreenDevice(userAgent));
    }
  }

  updateWideScreenModeFromWindow(): void {
    const isWidescreenMode = window.innerWidth >= MIN_DESKTOP_WIDTH;
    this.wideScreenMode$.next(isWidescreenMode);
  }
}
