import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Output} from '@angular/core';
import {NODE_BB_LOGIN_URL, NODE_BB_REGISTRATION_URL} from '@app/app-constants';
import {scrollToView} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';

@Component({
  selector: 'gt-user-registration-prompt',
  templateUrl: './user-registration-prompt.component.html',
  styleUrls: ['./user-registration-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRegistrationPromptComponent implements AfterViewInit {
  readonly loginLink = NODE_BB_LOGIN_URL;
  readonly registrationLink = NODE_BB_REGISTRATION_URL;

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  constructor(private readonly el: ElementRef,
              private readonly bss: BrowserStateService,
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
}
