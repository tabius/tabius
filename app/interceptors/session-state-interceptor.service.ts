import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {flatMap} from 'rxjs/operators';
import {AjaxSessionInfo} from '@common/ajax-model';
import {AuthService, LOGOUT_URL, UPDATE_SIGN_IN_STATE_URL} from '@app/services/auth.service';
import {UserDataService} from '@app/services/user-data.service';
import {waitForAllPromisesAndReturnFirstArg} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';

/** Checks session state in the TabiusAjaxResponse and updates app state. */
@Injectable()
export class SessionStateInterceptor implements HttpInterceptor {

  private userId?: string;

  constructor(private readonly authService: AuthService,
              private readonly uds: UserDataService,
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
                  const authActionPromise = session.userId ? this.authService.updateSignInState() : this.authService.signOut();
                  return waitForAllPromisesAndReturnFirstArg(event, [authActionPromise]);
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
