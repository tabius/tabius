import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LoginResponse} from '@common/ajax-model';
import {UserDataService} from '@app/services/user-data.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {NODE_BB_URL} from '@common/constants';
import {take} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly httpClient: HttpClient,
              private readonly uds: UserDataService,
              private readonly bss: BrowserStateService,
  ) {
  }


  async updateSignInState(): Promise<void> {
    if (!this.bss.isBrowser) {
      return;
    }
    try {
      const {user, settings, playlists} = await this.httpClient.get<LoginResponse>('/api/user/login').pipe(take(1)).toPromise();
      await Promise.all([
        this.uds.setUser(user),
        this.uds.updateUserSettingsOnFetch(settings),
        this.uds.cachePlaylists(playlists)]
      );
    } catch (e) {
      console.warn(e);
    }
  }

  static signIn(): void {
    window.location.href = `${NODE_BB_URL}/login`;
  }

  async signOut(): Promise<void> {
    await this.httpClient.get<void>('/api/user/logout').pipe(take(1)).toPromise();
    await this.uds.setUser(undefined);
    setTimeout(() => window.location.href = '/', 500);
  }
}

