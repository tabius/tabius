import { Injectable, TemplateRef } from '@angular/core';
import { PopoverRef } from '@app/popover/popover-ref';
import { PopoverService } from '@app/popover/popover.service';

export type HelpPageType = 'song' | 'collection';

@Injectable({ providedIn: 'root' })
export class HelpService {
  keyboardShortcutsTemplate?: TemplateRef<void>;

  private activeHelpPage?: HelpPageType;
  private helpPopoverRef?: PopoverRef;

  constructor(private readonly popover: PopoverService) {}

  showKeyboardShortcuts(): void {
    if (!this.keyboardShortcutsTemplate || this.helpPopoverRef) {
      console.debug(
        'HelpService.showKeyboardShortcuts: required elements are missed',
        this.keyboardShortcutsTemplate,
        this.helpPopoverRef,
      );
      return;
    }

    if (!this.activeHelpPage) {
      console.debug('HelpService.showKeyboardShortcuts: no active help page');
      return;
    }

    console.debug('HelpService.showKeyboardShortcuts: opening help popover');
    this.helpPopoverRef = this.popover.open(this.keyboardShortcutsTemplate, null, {
      data: this.activeHelpPage,
      panelClass: 'help-popover-panel',
    });

    this.helpPopoverRef.afterClosed().subscribe(() => {
      console.debug('HelpService.showKeyboardShortcuts: help popover is closed');
      this.helpPopoverRef = undefined;
    });
  }

  setActiveHelpPage(activeHelpPage: HelpPageType | undefined): void {
    if (activeHelpPage === this.activeHelpPage) {
      return;
    }
    if (this.helpPopoverRef) {
      this.helpPopoverRef.close();
    }
    this.activeHelpPage = activeHelpPage;
  }
}
