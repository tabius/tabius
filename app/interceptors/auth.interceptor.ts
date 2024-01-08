import { AuthHttpInterceptor as Auth0HttpInterceptor } from '@auth0/auth0-angular';
import { HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export class TabiusAuthHttpInterceptor extends Auth0HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // TabiusAuthHttpInterceptor is used for Auth0 debugging only today.
    return super.intercept(req, next);
  }
}
