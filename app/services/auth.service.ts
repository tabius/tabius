import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import * as firebase from 'firebase/app'; // for GoogleProvider only
import {AngularFireAuth} from '@angular/fire/auth';
import {AUTH_TOKEN_COOKIE_NAME, User} from '@common/user-model';
import {HttpClient} from '@angular/common/http';
import {firebaseUser2User} from 'common/util/misc_utils';
import {CookieService} from '@app/services/cookie.service';
import {Router} from '@angular/router';
import {LoginResponse} from '@common/ajax-model';
import {UserSessionState} from '@app/store/user-session-state';
import {UserDataService} from '@app/services/user-data.service';
import {FirebaseApp} from '@angular/fire';
import {isPlatformBrowser} from '@angular/common';
import {MGS_ERROR_DURING_SIGN_IN} from '@common/messages';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly isBrowser: boolean;
  private user?: User;

  constructor(public readonly fireAuth: AngularFireAuth,
              private readonly httpClient: HttpClient,
              private readonly cookieService: CookieService,
              private readonly session: UserSessionState,
              private readonly userDataService: UserDataService,
              private readonly router: Router,
              @Inject(PLATFORM_ID) readonly platformId: Object,
              @Inject(FirebaseApp) private readonly firebaseApp: FirebaseApp) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.session.user$.subscribe(user => this.user = user);
  }

  async signIn(): Promise<void> {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({prompt: 'select_account'});
      await this.fireAuth.auth.signInWithPopup(provider);

      // Dirty hack but what is the better solution?
      // Problem: need to wait for all observables to push new user info before returning from this method.
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.debug('Error during sign in', err);
      throw MGS_ERROR_DURING_SIGN_IN;
    }
  }

  /**
   * Opens Sign-In dialog if user is not signed in. Throws error if sign in is failed.
   * Does nothing if user is already signed in.
   */
  async askUserToSignInOrFail(): Promise<void> {
    if (!this.user) {
      await this.signIn();
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.fireAuth.auth.signOut();
      await this.userDataService.cleanupUserDataOnSignout();
      this.router.navigate(['/']).catch(err => console.error(err));
    } catch (error) {
      console.error('SignOut failed!', error);
    }
  }

  private async firebaseAuthStateCallback(): Promise<void> {
    try {
      const userAndToken = await this.updateUserInfoInCookiesIfNeeded();
      if (!userAndToken) {
        this.session.setUser(undefined);
        return;
      }

      // notify backend about user login event and wait for a response with settings.
      await this.httpClient.get('/api/user/login').toPromise()
          .then(object => {
            const {settings, playlists} = object as LoginResponse;
            this.userDataService.updateUserSettingsOnFetch(settings);
            this.userDataService.cachePlaylistsInBrowserStoreOnFetch(playlists);
          })
          .catch(e => console.error(e));

      this.session.setUser(userAndToken.user);
      const {returnUrl} = this.session;
      if (returnUrl.length > 0) {
        this.router.navigate([returnUrl]).catch(err => console.error(err));
        this.session.returnUrl = '';
      }
    } catch (e) {
      console.error('Error in firebaseAuthStateCallback', e);
    }
  }

  private updateAuthTokensInCookies(token: string|undefined): void {
    if (!this.isBrowser) {
      return;
    }
    if (token === undefined) {
      this.cookieService.delete(AUTH_TOKEN_COOKIE_NAME);
    } else {
      this.cookieService.set(AUTH_TOKEN_COOKIE_NAME, token, undefined, '/');
    }
  }

  async updateUserInfoInCookiesIfNeeded(): Promise<UpdateIdTokenResult|undefined> {
    const firebaseUser = this.isBrowser ? this.firebaseApp.auth().currentUser : undefined;
    if (!firebaseUser) {
      this.updateAuthTokensInCookies(undefined);
      return undefined;
    }
    const token = await firebaseUser.getIdToken();
    this.updateAuthTokensInCookies(token);
    const user = firebaseUser2User(firebaseUser);
    return {user, token};
  }

  connectToFirebase(): void {
    if (this.isBrowser) {
      this.fireAuth.authState.subscribe(() => this.firebaseAuthStateCallback());
    }
  }
}

interface UpdateIdTokenResult {
  user: User;
  token: string;
}
