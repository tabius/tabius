import {Injectable, Injector} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {AuthService} from '@auth0/auth0-angular';
import {Observable, of} from 'rxjs';
import {User} from 'auth0';
import {environment} from '@app/environments/environment';
import {truthy} from '@common/util/misc-utils';
import {Router} from '@angular/router';

/** State of the application when signin() method is called. */
interface AppStateOnSignIn {
  pathname: string;
}

@Injectable({providedIn: 'root'})
export class ClientAuthService {

  private readonly auth0Service?: AuthService<AppStateOnSignIn>;

  constructor(
      injector: Injector,
      browserStateService: BrowserStateService,
      router: Router,
  ) {
    if (browserStateService.isBrowser) {
      this.auth0Service = injector.get(AuthService);
      this.auth0Service.appState$.subscribe(state => {
        console.debug('ClientAuthService.auth0Service.appState$', state);
        if (state?.pathname && state.pathname !== window.location.pathname) {
          setTimeout(async () => await router.navigateByUrl(state.pathname, {replaceUrl: true}), 500);
        }
      });
    }
  }

  get user$(): Observable<User|null|undefined> {
    if (!this.auth0Service) {
      return of(null); // Server side mode.
    }
    return this.auth0Service.user$;
  }

  private getAuthService(): AuthService {
    return truthy(this.auth0Service);
  }

  signin(): void {
    this.getAuthService().loginWithRedirect({
      audience: environment.authConfig.audience,
      prompt: 'select_account',
      screen_hint: 'login',
      appState: <AppStateOnSignIn>{
        pathname: window.location.pathname
      }
    });
  }

  signup(): void {
    this.getAuthService().loginWithRedirect({
      audience: environment.authConfig.audience,
      prompt: 'select_account',
      screen_hint: 'signup',
    });
  }

  signout(): void {
    this.getAuthService().logout({returnTo: environment.url});
  }
}
