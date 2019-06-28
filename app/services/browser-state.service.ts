import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class BrowserStateService {

  private readonly isBrowser;

  constructor(@Inject(PLATFORM_ID) readonly platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** Returns true if the app is online or on the server side. Returns false only if the app is in browser and offline. */
  isOnline(): boolean {
    return !this.isBrowser || (!navigator || navigator.onLine === undefined || navigator.onLine);
  }

}
