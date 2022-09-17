import {HttpEvent, HttpHandler, HttpRequest} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Auth0ClientService, AuthClientConfig, AuthHttpInterceptor, AuthState} from '@auth0/auth0-angular';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Auth0Client} from '@auth0/auth0-spa-js';

/**
 * Adds authentication token to the requests in client mode.
 * Does nothing in server mode.
 */
@Injectable()
export class AuthInterceptor extends AuthHttpInterceptor {

  constructor(
      private readonly bss: BrowserStateService,
      configFactory: AuthClientConfig,
      @Inject(Auth0ClientService) auth0Client: Auth0Client,
      authState: AuthState,
  ) {
    super(configFactory, auth0Client, authState);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.bss.isServer) {
      return next.handle(req);
    }
    console.debug('AuthInterceptor:', req.url);
    return super.intercept(req, next);
  }
}
