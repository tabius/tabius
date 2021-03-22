import {Injectable} from '@angular/core';
import {NavigationEnd, NavigationStart, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {BrowserStateService} from '@app/services/browser-state.service';
import {HelpService} from '@app/services/help.service';

/** Tracks scroll positions on routing updates. */
@Injectable({
  providedIn: 'root'
})
export class RoutingNavigationHelper {

  private readonly pageOffsetYPerRoute = new Map<string, number>();

  constructor(private readonly bss: BrowserStateService,
              private readonly router: Router,
              private readonly helpService: HelpService,
  ) {
    if (bss.isBrowser) {
      this.router.events
          .pipe(filter(event => event instanceof NavigationStart || event instanceof NavigationEnd))
          .subscribe(event => {
            if (event instanceof NavigationStart) {
              this.helpService.setActiveHelpPage(undefined);
              this.pageOffsetYPerRoute.set(this.router.url, window.pageYOffset);
            }
          });
    }
  }

  restoreScrollPosition(): void {
    if (this.bss.isServer) {
      return;
    }
    const offsetY = this.pageOffsetYPerRoute.get(this.router.url);
    if (offsetY) {
      window.scroll({left: window.scrollX, top: offsetY,});
    }
  }

  resetSavedScrollPosition(url: string): void {
    this.pageOffsetYPerRoute.delete(url);
  }
}
