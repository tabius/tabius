import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { I18N } from '@app/app-i18n';
import { ClientAuthService } from '@app/services/client-auth.service';
import { scrollToView } from '@app/utils/misc-utils';

@Component({
    selector: 'gt-user-registration-prompt',
    templateUrl: './user-registration-prompt.component.html',
    styleUrls: ['./user-registration-prompt.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class UserRegistrationPromptComponent implements AfterViewInit {
  private readonly el = inject(ElementRef);
  private readonly bss = inject(BrowserStateService);
  authService = inject(ClientAuthService);

  readonly i18n = I18N.userRegistrationPromptComponent;

  @Input() showCloseButton = true;

  /** Emitted when a panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  close(): void {
    this.closeRequest.next({});
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  ngAfterViewInit(): void {
    if (this.bss.isBrowser) {
      setTimeout(() => {
        scrollToView(this.el.nativeElement);
      }, 200);
    }
  }

  onRegisterClicked(): void {
    this.authService.signup();
  }

  onSignInClicked(): void {
    this.authService.login();
  }
}
