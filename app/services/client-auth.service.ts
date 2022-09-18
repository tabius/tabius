import {Injectable, Injector} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {AuthService} from '@auth0/auth0-angular';
import {Observable, of} from 'rxjs';
import {User} from 'auth0';
import {environment} from '@app/environments/environment';

@Injectable({providedIn: 'root'})
export class ClientAuthService {

  private auth0Service?: AuthService;

  constructor(
      injector: Injector,
      browserStateService: BrowserStateService,
  ) {
    if (browserStateService.isBrowser) {
      this.auth0Service = injector.get(AuthService);
    }
  }

  get user$(): Observable<User|null|undefined> {
    if (!this.auth0Service) {
      return of(null); // Server side mode.
    }
    return this.auth0Service.user$;
  }

  signin(): void {
    this.auth0Service!.loginWithRedirect({audience: environment.authConfig.audience});
  }

  signup(): void {
    this.auth0Service!.loginWithRedirect({audience: environment.authConfig.audience});
  }

  signout(): void {
    this.auth0Service!.logout({returnTo: environment.url});
  }
}