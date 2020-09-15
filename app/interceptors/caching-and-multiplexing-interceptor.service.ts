import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {BrowserStateService} from '@app/services/browser-state.service';
import {tap} from 'rxjs/operators';

/**
 * 1. In server mode (server-side rendering) caches request results and re-uses them for all requests during page rendering.
 *
 * 2. In browser mode tracks in-flight requests and reuses their results for parallel requests: does not make equal parallel requests.
 *
 * Both optimizations are enabled only for GET requests.
 */
@Injectable()
export class CachingAndMultiplexingInterceptor implements HttpInterceptor {

  private readonly inFlightResponseByRequestGetUrl = new Map<string, Observable<HttpEvent<any>>>();

  private readonly serverSideResponseCache = new Map<string, any>();

  constructor(private readonly bss: BrowserStateService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const requestGetUrl = req.method === 'GET' ? req.urlWithParams : undefined;
    // console.debug(`New request: ${cacheKey}`);
    if (requestGetUrl) {
      const inFlightResponse = this.inFlightResponseByRequestGetUrl.get(requestGetUrl);
      if (inFlightResponse) {
        return inFlightResponse;
      }
    }
    // console.debug(`Not found inFlight: ${cacheKey}`);
    if (this.bss.isBrowser) {
      if (!requestGetUrl) {
        return next.handle(req);
      }
      // console.debug(`Adding to inFlight: ${cacheKey}`);
      const response$ = next.handle(req);
      this.inFlightResponseByRequestGetUrl.set(requestGetUrl, response$);
      return response$.pipe(
          tap(() => { // Once request is completed remove it from inFlight map.
            // console.debug(`Removing from inFlight: ${cacheKey}`, event);
            this.inFlightResponseByRequestGetUrl.delete(requestGetUrl);
          }),
      );
    }

    // Server side mode from here

    if (!requestGetUrl) {
      console.error(`SSR must use GET requests only: ${req.method}, url: ${req.url}`);
      return next.handle(req);
    }
    const cachedResponse = this.serverSideResponseCache.get(requestGetUrl);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle(req).pipe(
        tap(event => {
          // There may be other events besides the response.
          if (event instanceof HttpResponse) {
            this.serverSideResponseCache.set(requestGetUrl, event);
          }
        })
    );
  }
}
