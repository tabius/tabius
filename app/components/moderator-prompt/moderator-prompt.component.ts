import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';
import { TELEGRAM_CHANNEL_URL } from '@app/app-constants';
import { I18N } from '@app/app-i18n';
import { BrowserStateService } from '@app/services/browser-state.service';
import { LINK_STUDIO } from '@common/mounts';
import { scrollToView } from '@app/utils/misc-utils';

@Component({
    selector: 'gt-moderator-prompt',
    templateUrl: './moderator-prompt.component.html',
    styleUrls: ['./moderator-prompt.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ModeratorPromptComponent implements AfterViewInit {
  private readonly el = inject(ElementRef);
  private readonly bss = inject(BrowserStateService);

  readonly telegramLink = TELEGRAM_CHANNEL_URL;
  readonly studioLink = LINK_STUDIO;
  readonly i18n = I18N.moderatorPrompt;

  /** Emitted when a panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

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
