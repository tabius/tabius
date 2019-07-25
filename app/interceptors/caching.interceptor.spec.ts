import {getTestBed, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule,} from '@angular/common/http/testing';
import {HTTP_INTERCEPTORS, HttpClient, HttpEvent, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {delay} from 'rxjs/operators';
import {CachingInterceptor} from '@app/interceptors/caching.interceptor';
import {BrowserStateService} from '@app/services/browser-state.service';

@Injectable()
export class FakeResponseInterceptor implements HttpInterceptor {
  response?: HttpEvent<any>;
  responseDelayMillis = 20;
  requests: string[] = [];

  get count() {
    return this.requests.length;
  };

  intercept(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    this.requests.push(req.urlWithParams);
    const response = this.response || new HttpResponse({body: `Response body ${this.count}`});
    return of(response).pipe(delay(this.responseDelayMillis));
  }

  reset(): void {
    delete this.response;
    this.requests = [];
  }
}

const responseInterceptor = new FakeResponseInterceptor();

describe(`CachingInterceptor`, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {provide: BrowserStateService, useValue: {isBrowser: true}},
        {provide: HTTP_INTERCEPTORS, useClass: CachingInterceptor, multi: true,},
        {provide: HTTP_INTERCEPTORS, useValue: responseInterceptor, multi: true,},
      ],
    });
    responseInterceptor.reset();
  });

  it('does not deduplicate different GET requests', async done => {
    const testBed = getTestBed();
    const http = testBed.get<HttpClient>(HttpClient);
    const results: any[] = [];
    await Promise.all([
      http.get('/callA').toPromise().then(r => results.push(r)),
      http.get('/callB').toPromise().then(r => results.push(r))
    ]);
    expect(responseInterceptor.count).toBe(2);
    expect(results.length).toBe(2);
    expect(results[0]).toBeDefined();
    expect(results[0]).not.toBe(null);
    expect(results[0]).not.toBe(results[1]);

    done();
  });

  it('deduplicates simultaneous GET requests with the same Url', async done => {
    const testBed = getTestBed();
    const http = testBed.get<HttpClient>(HttpClient);
    const results: any[] = [];
    await Promise.all([
      http.get('/callA').toPromise().then(r => results.push(r)),
      http.get('/callA').toPromise().then(r => results.push(r)),
      http.get('/callA').toPromise().then(r => results.push(r))
    ]);
    expect(responseInterceptor.count).toBe(1);
    expect(results.length).toBe(3);
    expect(results[0]).toBeDefined();
    expect(results[0]).not.toBe(null);
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);

    done();
  });

  it('runs new requests after successful de-dup', async done => {
    const testBed = getTestBed();
    const http = testBed.get<HttpClient>(HttpClient);

    responseInterceptor.response = new HttpResponse({body: 'result1 response'});
    const results1: any[] = [];
    await Promise.all([
      http.get('/callA').toPromise().then(r => results1.push(r)),
      http.get('/callA').toPromise().then(r => results1.push(r))
    ]);
    expect(responseInterceptor.count).toBe(1);
    expect(results1.length).toBe(2);

    responseInterceptor.reset();
    responseInterceptor.response = new HttpResponse({body: 'result2 response'});
    const results2: any[] = [];
    await Promise.all([
      http.get('/callB').toPromise().then(r => results2.push(r)),
      http.get('/callB').toPromise().then(r => results2.push(r))
    ]);
    expect(responseInterceptor.count).toBe(1);
    expect(results2.length).toBe(2);

    expect(results1[0]).not.toBe(results2[0]);

    done();
  });

});
