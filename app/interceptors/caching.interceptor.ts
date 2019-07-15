import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {BrowserStateService} from '@app/services/browser-state.service';
import {tap} from 'rxjs/operators';

@Injectable()
export class CachingInterceptor implements HttpInterceptor {

  private readonly inFlight = new Map<string, Observable<HttpEvent<any>>>();

  private readonly cachedResponses = new Map<string, any>();

  constructor(private readonly bss: BrowserStateService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const cacheKey = req.method === 'GET' ? req.urlWithParams : undefined;
    // console.debug(`New request: ${cacheKey}`);
    if (cacheKey) {
      const inFlightResponse = this.inFlight.get(cacheKey);
      if (inFlightResponse) {
        return inFlightResponse;
      }
    }
    // console.debug(`Not found inFlight: ${cacheKey}`);
    if (this.bss.isBrowser) {
      if (!cacheKey) {
        return next.handle(req);
      }
      // console.debug(`Adding to inFlight: ${cacheKey}`);
      const response$ = next.handle(req);
      this.inFlight.set(cacheKey, response$);
      response$.toPromise().then(() => {
        // console.debug(`Removing from inFlight: ${cacheKey}`, event);
        this.inFlight.delete(cacheKey);
      });
      return response$;
    }

    // Server side mode from here

    if (!cacheKey) {
      console.error(`SSR should use GET request only: ${req.method}, url: ${req.url}`);
      return next.handle(req);
    }
    const cachedResponse = this.cachedResponses.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle(req).pipe(
        tap(event => {
          // There may be other events besides the response.
          if (event instanceof HttpResponse) {
            this.cachedResponses.set(cacheKey, event);
          }
        })
    );
  }
}
