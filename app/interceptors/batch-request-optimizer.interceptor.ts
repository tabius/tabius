import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, timer} from 'rxjs';
import {flatMap, map, share} from 'rxjs/operators';

export const BY_IDS_TOKEN = 'by-ids/';
export const BY_IDS_SEPARATOR = ',';

/** Merges multiple 'by-id' requests into a single 'by-ids' request. */
@Injectable()
export class BatchRequestOptimizerInterceptor implements HttpInterceptor {

  readonly pendingBatchRequests = new Map<string, BatchRequest>();

  /** Time in milliseconds the batch request will wait for new requests to merge before the real run. */
  debounceTimeInMillis = 25;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = req.method === 'GET' ? req.urlWithParams : undefined;
    if (!url || !url.startsWith('/api/')) {
      return next.handle(req);
    }
    const byIdsIdx = url.indexOf(BY_IDS_TOKEN);
    if (byIdsIdx < 0) {
      return next.handle(req);
    }
    const type = url.substring(0, byIdsIdx);
    const ids = url.substring(byIdsIdx + BY_IDS_TOKEN.length).split(BY_IDS_SEPARATOR);
    const batchRequest = this.pendingBatchRequests.get(type);
    if (!batchRequest) {
      return this.startBatchRequest(type, ids, req, next);
    }
    ids.forEach(id => batchRequest.ids.push(id));
    return this.selectFromBatchResponse(batchRequest, ids);
  }

  startBatchRequest(type: string, ids: readonly string[], req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const response = timer(this.debounceTimeInMillis)
        .pipe(
            flatMap(() => {
              this.pendingBatchRequests.delete(type); // delete from the pending list right before real run.
              const batchReq = {...req, urlWithParams: type + BY_IDS_TOKEN + ids.join(BY_IDS_SEPARATOR)} as HttpRequest<any>;
              return next.handle(batchReq);
            }),
            share(),
        );
    const batch = {type, ids: [...ids], response};
    this.pendingBatchRequests.set(type, batch);
    return this.selectFromBatchResponse(batch, ids);
  }

  selectFromBatchResponse(batch: BatchRequest, ids: readonly string[]): Observable<HttpEvent<any>> {
    return batch.response.pipe(
        map(event => {
          if (event instanceof HttpResponse) {
            const results = event.body as any[];
            const indexesToReturn = ids.map(id => batch.ids.indexOf(id));
            const filteredResults = indexesToReturn.map(idx => results[idx]);
            return event.clone({body: filteredResults});
          }
          return event;
        })
    );
  }
}

interface BatchRequest {
  type: string;
  ids: string[];
  response: Observable<HttpEvent<any>>;
}
