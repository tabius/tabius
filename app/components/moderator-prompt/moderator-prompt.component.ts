import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Output} from '@angular/core';
import {TELEGRAM_CHANNEL_URL} from '@app/app-constants';
import {I18N} from '@app/app-i18n';
import {scrollToView} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {LINK_STUDIO} from '@common/mounts';

@Component({
  selector: 'gt-moderator-prompt',
  templateUrl: './moderator-prompt.component.html',
  styleUrls: ['./moderator-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModeratorPromptComponent implements AfterViewInit {
  readonly telegramLink = TELEGRAM_CHANNEL_URL;
  readonly studioLink = LINK_STUDIO;
  readonly i18n = I18N.moderatorPrompt;

  /** Emitted when a panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  constructor(private readonly el: ElementRef,
              private readonly bss: BrowserStateService,
  ) {
  }

  close(): void {
    this.closeRequest.next({});
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
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
