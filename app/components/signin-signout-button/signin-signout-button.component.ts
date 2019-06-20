import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {UserSessionState} from '@app/store/user-session-state';
import {AuthService} from '@app/services/auth.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {ToastService} from '@app/toast/toast.service';

@Component({
  selector: 'gt-signin-signout-button',
  templateUrl: './signin-signout-button.component.html',
  styleUrls: ['./signin-signout-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SigninSignoutButtonComponent implements OnInit, OnDestroy {

  userName?: string;

  private readonly destroyed$ = new Subject();

  constructor(private readonly session: UserSessionState,
              private readonly authService: AuthService,
              private readonly cd: ChangeDetectorRef,
              private readonly toastService: ToastService,
  ) {
  }

  ngOnInit(): void {
    this.session.user$
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.userName = user && user.name;
          this.cd.markForCheck();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  signIn() {
    this.authService.signIn()
        .catch(err => this.toastService.warning(err));
  }

  signOut() {
    this.authService.signOut();
  }

}
