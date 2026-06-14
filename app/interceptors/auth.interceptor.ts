import { AuthHttpInterceptor as Auth0HttpInterceptor, AuthService } from '@auth0/auth0-angular';
import { HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class TabiusAuthHttpInterceptor extends Auth0HttpInterceptor {
  private readonly auth = inject(AuthService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // The app allows anonymous browsing. Only run the Auth0 token logic for authenticated users:
    // otherwise the SDK calls getTokenSilently() with no refresh token and rejects with
    // `missing_refresh_token`, which surfaces as a console error on every API request.
    return this.auth.isLoading$.pipe(
      filter(isLoading => !isLoading),
      take(1),
      switchMap(() => this.auth.isAuthenticated$.pipe(take(1))),
      switchMap(isAuthenticated => (isAuthenticated ? super.intercept(req, next) : next.handle(req))),
    );
  }
}
