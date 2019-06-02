import {HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {fromPromise} from 'rxjs/internal-compatibility';
import {switchMap} from 'rxjs/operators';
import {AuthService} from '@app/services/auth.service';

// TODO: re-check how it works on server side!
@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {

  constructor(private readonly authService: AuthService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const authTokenPromise = this.authService.updateUserInfoInCookiesIfNeeded();
    return fromPromise(authTokenPromise).pipe(
        switchMap(() =>
            next.handle(req.clone({
              withCredentials: true
            }))
        )
    );
  }
}
