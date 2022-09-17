import {HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {environment} from '@app/environments/environment';
import {BrowserStateService} from '@app/services/browser-state.service';

/** Sets correct backend URL to requests and adds 'withCredentials:true' option. */
@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {

  private readonly backendUrl!: string;

  constructor(bss: BrowserStateService) {
    // Use direct (not proxied) API url during SSR rendering.
    this.backendUrl = bss.isServer ? environment.ssrBackendUrl : environment.backendUrl;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const completeUrlRequest = req.clone({
      url: `${this.backendUrl}${req.url}`,
      withCredentials: true,
    });
    return next.handle(completeUrlRequest);
  }
}
