import { Injectable, Injector } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { AuthService, User } from '@auth0/auth0-angular';
import { firstValueFrom, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { truthy } from 'assertic';
import { environment } from '@app/environments/environment';
import { RedirectLoginOptions } from '@auth0/auth0-spa-js/src/global';

/** State of the application when signin() method is called. */
interface AppStateOnLogin {
  pathname: string;
}

@Injectable({ providedIn: 'root' })
export class ClientAuthService {
  private readonly auth0Service?: AuthService<AppStateOnLogin>;

  constructor(injector: Injector, browserStateService: BrowserStateService, router: Router) {
    if (browserStateService.isBrowser) {
      this.auth0Service = injector.get(AuthService);
      this.auth0Service.appState$.subscribe(state => {
        // console.debug('ClientAuthService.auth0Service.appState$', state);
        if (state?.pathname && state.pathname !== window.location.pathname) {
          setTimeout(async () => await router.navigateByUrl(state.pathname, { replaceUrl: true }), 100);
        }
      });
    }
  }

  get user$(): Observable<User | null | undefined> {
    if (!this.auth0Service) {
      return of(null); // Server side mode.
    }
    return this.auth0Service.user$;
  }

  private getAuthService(): AuthService {
    return truthy(this.auth0Service);
  }

  login(): void {
    const loginOptions: RedirectLoginOptions = {
      authorizationParams: {
        display: 'page',
        prompt: 'select_account',
        screen_hint: 'login',
      },
      appState: <AppStateOnLogin>{
        pathname: window.location.pathname,
      },
    };
    this.getAuthService().loginWithRedirect(loginOptions);
  }

  signup(): void {
    const loginOptions: RedirectLoginOptions = {
      authorizationParams: {
        display: 'page',
        prompt: 'select_account',
        screen_hint: 'signup',
      },
      appState: <AppStateOnLogin>{
        pathname: window.location.pathname,
      },
    };
    this.getAuthService().loginWithRedirect(loginOptions);
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.getAuthService().logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? window.location.origin : environment.url,
        },
      }),
    );
  }
}
