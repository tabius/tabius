import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {AuthService} from '@app/services/auth.service';
import {UserSessionState} from '@app/store/user-session-state';

/** TODO: not used at all. Remove? */
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private readonly router: Router,
              private readonly authService: AuthService,
              private readonly session: UserSessionState) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.session.isSignedIn().then(signedIn => {
      if (signedIn) {
        return true;
      }
      this.session.returnUrl = state.url;
      this.router.navigate(['/']).catch(err => console.error(err));
      return false;
    });
  }
}
