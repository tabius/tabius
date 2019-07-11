import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {BrowserStateService} from '@app/services/browser-state.service';
import {tap} from 'rxjs/operators';

@Injectable()
export class CachingInterceptor implements HttpInterceptor {

  private readonly cache = new Map<string, any>();

  constructor(private readonly bss: BrowserStateService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.bss.isBrowser) {
      return next.handle(req);
    }
    if (req.method !== 'GET') {
      console.error(`SSR should use GET request only: ${req.method}, url: ${req.url}`);
      return next.handle(req);
    }
    const key = req.urlWithParams;
    const cachedResponse = this.cache.get(key);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle(req).pipe(
        tap(event => {
          // There may be other events besides the response.
          if (event instanceof HttpResponse) {
            this.cache.set(key, event);
          }
        })
    );
  }
}
