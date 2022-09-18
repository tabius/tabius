import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {UserService} from '@app/services/user.service';
import {I18N} from '@app/app-i18n';
import {ClientAuthService} from '@app/services/client-auth.service';

@Component({
  selector: 'gt-signin-signout-button',
  templateUrl: './signin-signout-button.component.html',
  styleUrls: ['./signin-signout-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SigninSignoutButtonComponent implements OnInit, OnDestroy {

  username?: string;

  readonly i18n = I18N.signinSignoutButton;

  private readonly destroyed$ = new Subject();

  constructor(private readonly uds: UserService,
              private readonly cd: ChangeDetectorRef,
              public authService: ClientAuthService,
  ) {
  }

  ngOnInit(): void {
    this.authService.user$
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.username = user?.name || user?.email;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  signIn(): void {
    this.authService.signin();
  }

  signOut(): void {
    this.authService.signout();
  }

}
