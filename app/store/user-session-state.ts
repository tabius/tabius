import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {ReplaySubject} from 'rxjs';
import {User} from '@common/user-model';
import {isPlatformBrowser} from '@angular/common';
import {take} from 'rxjs/operators';
import {MGS_SIGN_IN_REQUIRED} from '@common/messages';

/** In browser session state. */
@Injectable({
  providedIn: 'root'
})
export class UserSessionState {

  private readonly isBrowser: boolean;

  readonly user$ = new ReplaySubject<User|undefined>(1);

  /** Used internally for de-dep logic. */
  private userSnapshot?: User = undefined;
  private firstUserUpdate: boolean = true;

  /** Url to return after successful sign in. */
  public returnUrl = '';

  constructor(@Inject(PLATFORM_ID) readonly platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Returns a promise that resolves to true if user signed.
   * Promise based approach is used because firebase-auth need some time to complete.
   */
  async isSignedIn(): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    const user = await this.user$.pipe(take(1)).toPromise();
    return user !== undefined;
  }

  setUser(user: User|undefined): void {
    if (!this.firstUserUpdate && user === this.userSnapshot || (user && this.userSnapshot && user.id === this.userSnapshot.id)) {
      return; // same value, ignore.
    }
    this.firstUserUpdate = false;
    this.userSnapshot = user;
    this.user$.next(user);
  }

  /** Throws error if user is not signed in. Does nothing if user is signed in. */
  async requireSignIn(): Promise<void> {
    const signedIn = await this.isSignedIn();
    if (!signedIn) {
      throw MGS_SIGN_IN_REQUIRED;
    }
  }
}
