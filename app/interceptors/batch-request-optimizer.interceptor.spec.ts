import {getTestBed, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule,} from '@angular/common/http/testing';
import {HTTP_INTERCEPTORS, HttpClient, HttpResponse} from '@angular/common/http';
import {BatchRequestOptimizerInterceptor} from '@app/interceptors/batch-request-optimizer.interceptor';
import {FakeResponseInterceptor} from '@app/interceptors/caching.interceptor.spec';

const responseInterceptor = new FakeResponseInterceptor();
responseInterceptor.responseDelayMillis = 0;

function newBatchInterceptor(): BatchRequestOptimizerInterceptor {
  const interceptor = new BatchRequestOptimizerInterceptor();
  interceptor.debounceTimeInMillis = 5;
  return interceptor;
}

describe(`BatchRequestOptimizerInterceptor`, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {provide: HTTP_INTERCEPTORS, useValue: newBatchInterceptor(), multi: true,},
        {provide: HTTP_INTERCEPTORS, useValue: responseInterceptor, multi: true,},
      ],
    });
    responseInterceptor.reset();
  });

  it('merges multiple get requests into batches', async done => {
    responseInterceptor.response = new HttpResponse({body: ['r0', 'r1']});
    const testBed = getTestBed();
    const http = testBed.get<HttpClient>(HttpClient);
    const results: any[] = [];
    await Promise.all([
      http.get('/api/artist/by-ids/0').toPromise().then(r => results.push(r)),
      http.get('/api/artist/by-ids/1').toPromise().then(r => results.push(r)),
    ]);

    expect(responseInterceptor.count).toBe(1);
    expect(results.length).toBe(2);
    expect(results[0]).toEqual(['r0']);
    expect(results[1]).toEqual(['r1']);

    done();
  });

  it('does not merge different kind of requests into a single batch', async done => {
    const testBed = getTestBed();
    const http = testBed.get<HttpClient>(HttpClient);
    await Promise.all([
      http.get('/api/artist/by-ids/1').toPromise(),
      http.get('/api/song/by-ids/2').toPromise(),
      http.get('/api/all/5').toPromise(),
      http.post('/api/artist/by-ids/2').toPromise(),
    ]);
    expect(responseInterceptor.count).toBe(4);
    done();
  });
});

