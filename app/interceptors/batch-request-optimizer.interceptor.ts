import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, timer} from 'rxjs';
import {flatMap, map, share} from 'rxjs/operators';

/** Prefix for all 'by-ids' requests. Example: /api/song/by-ids/id1,id2,id3 or /api/song/details-by-ids/ia1,id2,id3.. */
export const BY_IDS_TOKEN = 'by-ids/';

/** Ids separator. */
export const BY_IDS_SEPARATOR = ',';

/** Merges multiple 'by-ids' requests into a single 'by-ids' request. */
@Injectable()
export class BatchRequestOptimizerInterceptor implements HttpInterceptor {

  readonly pendingBatchRequests = new Map<string, BatchRequest>();

  /** Time in milliseconds the batch request will wait for new requests to merge before the real run. */
  batchWaitTimeInMillis = 100;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = req.method === 'GET' ? req.urlWithParams : undefined;
    if (!url) {
      return next.handle(req);
    }
    const byIdsIdx = url.indexOf(BY_IDS_TOKEN);
    if (byIdsIdx < 0) {
      return next.handle(req);
    }
    const type = url.substring(0, byIdsIdx);
    const ids = url.substring(byIdsIdx + BY_IDS_TOKEN.length).split(BY_IDS_SEPARATOR);
    const batch = this.pendingBatchRequests.get(type);
    return batch ? this.joinToBatchRequest(batch, ids) : this.startBatchRequest(type, ids, req, next);
  }

  private startBatchRequest(type: string, ids: readonly string[], req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const batchIds = new Set<string>(ids);
    const response = timer(this.batchWaitTimeInMillis)
        .pipe(
            flatMap(() => {
              this.pendingBatchRequests.delete(type); // delete from the pending list right before real run.
              const sortedUniqueIds = [...batchIds.keys()].sort();
              const batchReq = req.clone({url: type + BY_IDS_TOKEN + sortedUniqueIds.join(BY_IDS_SEPARATOR)});
              return next.handle(batchReq);
            }),
            share(),
        );
    const batch = {type, ids: batchIds, response};
    this.pendingBatchRequests.set(type, batch);
    return this.selectFromBatchResponse(batch, ids);
  }

  private joinToBatchRequest(batch: BatchRequest, ids: readonly string[]): Observable<HttpEvent<any>> {
    ids.forEach(id => batch.ids.add(id));
    return this.selectFromBatchResponse(batch, ids);
  }

  private selectFromBatchResponse(batch: BatchRequest, ids: readonly string[]): Observable<HttpEvent<any>> {
    return batch.response.pipe(
        map(event => {
          if (event instanceof HttpResponse) {
            const results = event.body as { id: any }[];
            const filteredResults: any[] = [];
            for (const id of ids) {
              for (const result of results) {
                if (result.id === id) {
                  filteredResults.push(result);
                  break;
                }
              }
            }
            return event.clone({body: filteredResults});
          }
          return event;
        })
    );
  }
}

interface BatchRequest {
  /** Url prefix before ids. */
  type: string;
  /** List of ids to be queried. */
  ids: Set<string>;
  /** Response chain. */
  response: Observable<HttpEvent<any>>;
}
