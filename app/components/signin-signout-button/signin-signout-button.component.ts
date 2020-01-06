import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {UserService} from '@app/services/user.service';
import {I18N} from '@app/app-i18n';

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
              private readonly authService: AuthService,
              private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this.uds.getUser()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.username = user && user.username;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  signIn(): void {
    AuthService.signIn();
  }

  signOut(): void {
    this.authService.signOut(); //todo: show toast on error?
  }

}
