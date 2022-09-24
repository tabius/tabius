import {Injectable, Injector} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {AuthService} from '@auth0/auth0-angular';
import {Observable, of} from 'rxjs';
import {User} from 'auth0';
import {environment} from '@app/environments/environment';
import {truthy} from '@common/util/misc-utils';

@Injectable({providedIn: 'root'})
export class ClientAuthService {

  private readonly auth0Service?: AuthService;

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

  private getAuthService(): AuthService {
    return truthy(this.auth0Service);
  }

  signin(): void {
    this.getAuthService().loginWithRedirect({
      audience: environment.authConfig.audience,
      prompt: 'select_account',
    });
  }

  signup(): void {
    this.getAuthService().loginWithRedirect({
      audience: environment.authConfig.audience,
      prompt: 'select_account',
    });
  }

  signout(): void {
    this.getAuthService().logout({returnTo: environment.url});
  }
}
