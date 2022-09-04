import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';

const HTTP_STATUS_UNAUTHORIZED = 401;

@Injectable()
export class ErrorsInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req)
        .pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === HTTP_STATUS_UNAUTHORIZED) {
                //TODO: return fromPromise(this.authService.logout()).pipe(
                //     take(1),
                //     flatMap(() => throwError(error))
                // );
              }
              return throwError(error);
            })
        );
  }
}
