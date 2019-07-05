import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {User} from '@common/user-model';
import {UserDataService} from '@app/services/user-data.service';

/** In browser session state. */
@Injectable({
  providedIn: 'root'
})
export class UserSessionState {

  readonly user$: Observable<User|undefined>;

  /** Url to return after successful sign in. */
  public returnUrl = ''; //todo: remove? persist in LS?

  constructor(private readonly uds: UserDataService) {
    this.user$ = uds.getUser();
  }

  async setUser(user: User|undefined): Promise<void> {
    await this.uds.setUser(user);
  }

}
