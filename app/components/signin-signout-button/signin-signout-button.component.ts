import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {UserDataService} from '@app/services/user-data.service';

@Component({
  selector: 'gt-signin-signout-button',
  templateUrl: './signin-signout-button.component.html',
  styleUrls: ['./signin-signout-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SigninSignoutButtonComponent implements OnInit, OnDestroy {

  userName?: string;

  private readonly destroyed$ = new Subject();

  constructor(private readonly uds: UserDataService,
              private readonly authService: AuthService,
              private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this.uds.getUser()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.userName = user && user.name;
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
    this.authService.signOut();
  }

}
