import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Output} from '@angular/core';
import {NODE_BB_ADD_NEW_CATEGORY_URL} from '@app/app-constants';
import {I18N} from '@app/app-i18n';
import {scrollToView} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';

@Component({
  selector: 'gt-moderator-prompt',
  templateUrl: './moderator-prompt.component.html',
  styleUrls: ['./moderator-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModeratorPromptComponent implements AfterViewInit {
  readonly addNewCategoryLink = NODE_BB_ADD_NEW_CATEGORY_URL;
  readonly i18n = I18N.moderatorPrompt;

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
