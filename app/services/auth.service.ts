import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LoginResponse} from '@common/ajax-model';
import {UserDataService} from '@app/services/user-data.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {NODE_BB_SESSION_COOKIE, NODE_BB_URL} from '@common/constants';
import {CookieService} from '@app/services/cookie.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly httpClient: HttpClient,
              private readonly uds: UserDataService,
              private readonly bss: BrowserStateService,
              private readonly cookieService: CookieService,
  ) {
  }


  async updateSignInState(): Promise<void> {
    if (!this.bss.isBrowser || !this.bss.isOnline()) {
      return;
    }
    try {
      const {user, settings, playlists} = await this.httpClient.get<LoginResponse>('/api/user/login').toPromise();
      await Promise.all([
        this.uds.setUser(user),
        this.uds.updateUserSettingsOnFetch(settings),
        this.uds.cachePlaylistsInBrowserStore(playlists)]
      );
    } catch (e) {
      console.warn(e);
    }
  }

  static signIn(): void {
    window.location.href = `${NODE_BB_URL}/login`;
  }

  signOut(): void {
    this.cookieService.delete(NODE_BB_SESSION_COOKIE);
    this.uds.setUser(undefined)
        .then(() => {
          setTimeout(() => window.location.href = '/', 500);
        })
        .catch(err => console.warn(err));
  }

}

