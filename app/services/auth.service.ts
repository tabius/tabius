import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LoginResponse} from '@common/ajax-model';
import {UserService} from '@app/services/user.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {NODE_BB_LOGIN_URL} from '@common/constants';
import {take} from 'rxjs/operators';

export const UPDATE_SIGN_IN_STATE_URL = '/api/user/login';
export const LOGOUT_URL = '/api/user/logout';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly httpClient: HttpClient,
              private readonly uds: UserService,
              private readonly bss: BrowserStateService,
  ) {
  }


  async updateSignInState(): Promise<void> {
    if (!this.bss.isBrowser) {
      return;
    }
    try {
      const {user, settings} = await this.httpClient.get<LoginResponse>(UPDATE_SIGN_IN_STATE_URL).pipe(take(1)).toPromise();
      if (user) {
        await this.uds.setUserOnSignIn(user);
        await this.uds.updateUserSettings(settings);
      } else {
        await this.uds.resetStoreStateOnSignOut();
      }
    } catch (e) {
      console.warn(e);
    }
  }

  static signIn(): void {
    window.location.href = NODE_BB_LOGIN_URL;
  }

  async signOut(): Promise<void> {
    await this.httpClient.get<void>(LOGOUT_URL).pipe(take(1)).toPromise();
    await this.uds.resetStoreStateOnSignOut();
    setTimeout(() => window.location.href = NODE_BB_LOGIN_URL, 500);
  }
}

