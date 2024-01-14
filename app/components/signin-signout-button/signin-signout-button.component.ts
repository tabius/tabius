import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { I18N } from '@app/app-i18n';
import { ClientAuthService } from '@app/services/client-auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'gt-signin-signout-button',
  templateUrl: './signin-signout-button.component.html',
  styleUrls: ['./signin-signout-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SigninSignoutButtonComponent {
  username?: string;

  readonly i18n = I18N.signinSignoutButton;

  constructor(private readonly cd: ChangeDetectorRef, public authService: ClientAuthService) {
    this.authService.user$.pipe(takeUntilDestroyed()).subscribe(user => {
      this.username = user?.name || user?.email;
      this.cd.markForCheck();
    });
  }

  signIn(): void {
    this.authService.signin();
  }

  signOut(): void {
    this.authService.logout().then();
  }
}
