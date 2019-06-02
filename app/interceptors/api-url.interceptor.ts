import {HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {TABIUS_BASE_API_URL} from '@common/constants';

@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  constructor(@Inject(TABIUS_BASE_API_URL) private baseUrl: string) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const completeUrlRequest = req.clone({url: `${this.baseUrl}${req.url}`});
    return next.handle(completeUrlRequest);
  }
}
