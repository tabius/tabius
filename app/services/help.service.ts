import {Injectable, TemplateRef} from '@angular/core';
import {PopoverRef} from '@app/popover/popover-ref';
import {PopoverService} from '@app/popover/popover.service';

export type HelpPageType = 'song'|'collection';

@Injectable({
  providedIn: 'root'
})
export class HelpService {

  keyboardShortcutsTemplate?: TemplateRef<{}>;

  private activeHelpPage?: HelpPageType;
  private helpPopoverRef?: PopoverRef;

  constructor(private readonly popover: PopoverService) {
  }

  showKeyboardShortcuts(): void {
    if (!this.keyboardShortcutsTemplate || this.helpPopoverRef) {
      return;
    }

    if (!this.activeHelpPage) {
      return;
    }

    this.helpPopoverRef = this.popover.open(this.keyboardShortcutsTemplate, null, {data: this.activeHelpPage});

    this.helpPopoverRef.afterClosed().subscribe(() => {
      this.helpPopoverRef = undefined;
    });
  }

  setActiveHelpPage(activeHelpPage: HelpPageType|undefined): void {
    if (activeHelpPage === this.activeHelpPage) {
      return;
    }
    if (this.helpPopoverRef) {
      this.helpPopoverRef.close();
    }
    this.activeHelpPage = activeHelpPage;
  }
}
