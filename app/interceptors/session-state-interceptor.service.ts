import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {flatMap} from 'rxjs/operators';
import {AjaxSessionInfo} from '@common/ajax-model';
import {AuthService, LOGOUT_URL, UPDATE_SIGN_IN_STATE_URL} from '@app/services/auth.service';
import {UserService} from '@app/services/user.service';
import {waitForAllPromisesAndReturnFirstArg} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';

/** Checks session state in the Tabius AjaxResponse and updates app state. */
@Injectable()
export class SessionStateInterceptor implements HttpInterceptor {

  private userId?: string;

  constructor(private readonly authService: AuthService,
              private readonly uds: UserService,
              private readonly bss: BrowserStateService,
  ) {
    this.uds.getUser().subscribe(user => this.userId = user && user.id);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.bss.isServer || isSessionStateManagementRequest(req)) {
      return next.handle(req);
    }
    return next.handle(req)
        .pipe(
            flatMap(event => {
              if (event instanceof HttpResponse) {
                const session: AjaxSessionInfo|undefined = (event.body || {}).session;
                if (session && this.userId !== session.userId) {
                  console.info(`Enforcing session info update. Old user: ${this.userId} new user: ${session.userId}`);
                  const authPromise$$ = session.userId ? this.authService.updateSignInState() : this.authService.signOut();
                  return waitForAllPromisesAndReturnFirstArg(event, [authPromise$$]);
                }
              }
              return of(event);
            })
        );
  }
}

function isSessionStateManagementRequest(req: HttpRequest<any>): boolean {
  const url = req.url;
  return !!url && (url.endsWith(UPDATE_SIGN_IN_STATE_URL) || url.endsWith(LOGOUT_URL));
}
