import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {scrollToView} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {I18N} from '@app/app-i18n';
import {ClientAuthService} from '@app/services/client-auth.service';

@Component({
  selector: 'gt-user-registration-prompt',
  templateUrl: './user-registration-prompt.component.html',
  styleUrls: ['./user-registration-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRegistrationPromptComponent implements AfterViewInit {
  readonly i18n = I18N.userRegistrationPromptComponent;

  @Input() showCloseButton = true;

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  constructor(private readonly el: ElementRef,
              private readonly bss: BrowserStateService,
              public authService: ClientAuthService,
  ) {
  }

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
    this.authService.signin();
  }
}
