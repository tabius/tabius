import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, flatMap, take} from 'rxjs/operators';
import {AuthService} from '@app/services/auth.service';
import {fromPromise} from 'rxjs/internal-compatibility';

const HTTP_STATUS_UNAUTHORIZED = 401;

@Injectable()
export class ErrorsInterceptor implements HttpInterceptor {

  constructor(private readonly authService: AuthService,) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req)
        .pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === HTTP_STATUS_UNAUTHORIZED) {
                return fromPromise(this.authService.signOut()).pipe(
                    take(1),
                    flatMap(() => throwError(error))
                );
              }
              return throwError(error);
            })
        );
  }
}
