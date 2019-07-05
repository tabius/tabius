import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LoginResponse} from '@common/ajax-model';
import {UserSessionState} from '@app/store/user-session-state';
import {UserDataService} from '@app/services/user-data.service';
import {BrowserStateService} from '@app/services/browser-state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly httpClient: HttpClient,
              private readonly session: UserSessionState,
              private readonly userDataService: UserDataService,
              private readonly bss: BrowserStateService,
  ) {
  }


  async updateSignInState(): Promise<void> {
    if (!this.bss.isBrowser || !this.bss.isOnline()) {
      return;
    }
    try {
      const {user, settings, playlists} = await this.httpClient.get<LoginResponse>('/api/user/login').toPromise();
      await Promise.all([
        this.session.setUser(user),
        this.userDataService.updateUserSettingsOnFetch(settings),
        this.userDataService.cachePlaylistsInBrowserStore(playlists)]
      );
    } catch (e) {
      console.warn(e);
    }
  }
}

