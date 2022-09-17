import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable, Injector} from '@angular/core';
import {Observable} from 'rxjs';
import {Auth0ClientService, AuthClientConfig, AuthHttpInterceptor, AuthState} from '@auth0/auth0-angular';
import {BrowserStateService} from '@app/services/browser-state.service';
import {truthy} from '@common/util/misc-utils';

/**
 * Adds authentication token to the requests in client mode.
 * Does nothing in server mode.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  auth0Interceptor?: AuthHttpInterceptor;

  constructor(
      private readonly browserStateService: BrowserStateService,
      injector: Injector,
  ) {
    if (browserStateService.isBrowser) {
      const configFactory = injector.get(AuthClientConfig);
      const auth0Client = injector.get(Auth0ClientService);
      const authState = injector.get(AuthState);
      this.auth0Interceptor = new AuthHttpInterceptor(configFactory, auth0Client, authState);
    }
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.browserStateService.isServer) {
      return next.handle(req);
    }
    console.debug('Auth0Interceptor:', req.url);
    return truthy(this.auth0Interceptor).intercept(req, next);
  }
}
