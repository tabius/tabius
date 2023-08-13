import {Injectable} from '@angular/core';
import {NavigationStart, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {BrowserStateService} from '@app/services/browser-state.service';
import {HelpService} from '@app/services/help.service';
import {Meta, Title} from '@angular/platform-browser';
import {I18N} from '@app/app-i18n';

/** Tracks scroll positions on routing updates. */
@Injectable({
  providedIn: 'root'
})
export class RoutingNavigationHelper {

  private readonly pageOffsetYPerRoute = new Map<string, number>();
  private readonly i18n = I18N.common;

  constructor(private readonly bss: BrowserStateService,
              private readonly router: Router,
              private readonly helpService: HelpService,
              readonly title: Title,
              readonly meta: Meta,
  ) {
    if (bss.isBrowser) {
      this.router.events
          .pipe(filter(event => event instanceof NavigationStart))
          .subscribe(event => {
            if (event instanceof NavigationStart) {
              this.helpService.setActiveHelpPage(undefined);
              this.pageOffsetYPerRoute.set(this.router.url, window.scrollY);

              // TODO: does not work in SSR mode after page re-renders in browser for Song & Collection pages. Document & test before re-enabling.
              // Reset title to default if needed.
              // const oldPageTitle = this.title.getTitle();
              // setTimeout(() => {
              //   if (oldPageTitle === this.title.getTitle() && oldPageTitle !== this.i18n.pageTitle) {
              //     updatePageMetadata(this.title, this.meta, {
              //       title: this.i18n.pageTitle,
              //       description: this.i18n.pageDescription,
              //       keywords: this.i18n.keywords,
              //       image: `${environment.url}/assets/site-logo.png`,
              //     });
              //   }
              // }, 500);
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
