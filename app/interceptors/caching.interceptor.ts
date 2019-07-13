import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of, ReplaySubject} from 'rxjs';
import {BrowserStateService} from '@app/services/browser-state.service';
import {tap} from 'rxjs/operators';

@Injectable()
export class CachingInterceptor implements HttpInterceptor {

  private readonly inFlight = new Map<string, ReplaySubject<HttpResponse<any>>>();

  private readonly cachedResponses = new Map<string, any>();

  constructor(private readonly bss: BrowserStateService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const cacheKey = req.method === 'GET' ? req.urlWithParams : undefined;
    console.debug(`New request: ${cacheKey}`);
    if (cacheKey) {
      const inFlightResponse = this.inFlight.get(cacheKey);
      if (inFlightResponse) {
        console.log(`Found inFlight: ${cacheKey}`);
        return inFlightResponse;
      }
    }
    console.debug(`Not found inFlight: ${cacheKey}`);
    if (this.bss.isBrowser) {
      if (!cacheKey) {
        return next.handle(req);
      }
      console.debug(`Adding to inFlight: ${cacheKey}`);
      const response$ = new ReplaySubject<HttpResponse<any>>(1);
      this.inFlight.set(cacheKey, response$);
      const responseObservable = next.handle(req);
      return responseObservable.pipe(tap(event => {
        if (event instanceof HttpResponse) {
          console.debug(`Removing from inFlight: ${cacheKey}`, event);
          this.inFlight.delete(cacheKey);
          response$.next(event);
        }
      }));
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
