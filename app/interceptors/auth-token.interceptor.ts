import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {fromPromise} from 'rxjs/internal-compatibility';
import {switchMap} from 'rxjs/operators';
import {AuthService} from '@app/services/auth.service';
import {Observable} from 'rxjs';

/** Injects credentials (cookies) into the request. Client side interceptor. */
@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {

  constructor(private readonly authService: AuthService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authTokenPromise = this.authService.updateAuthCookie();
    return fromPromise(authTokenPromise).pipe(
        switchMap(() => next.handle(req.clone({withCredentials: true})))
    );
  }
}
