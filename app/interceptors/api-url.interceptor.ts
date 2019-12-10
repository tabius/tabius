import {HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {environment} from '@app/environments/environment';

@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const completeUrlRequest = req.clone({url: `${environment.backendUrl}${req.url}`});
    return next.handle(completeUrlRequest);
  }
}
