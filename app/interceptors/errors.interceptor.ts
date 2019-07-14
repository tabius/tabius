import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {FORUM_LOGIN_LINK} from '@common/mounts';
import {catchError} from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req)
        .pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) {
                window.location.href = FORUM_LOGIN_LINK;
              }
              return throwError(error);
            })
        );
  }
}
