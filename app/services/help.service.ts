import {Injectable, TemplateRef} from '@angular/core';
import {PopoverRef} from '@app/popover/popover-ref';
import {PopoverService} from '@app/popover/popover.service';

@Injectable({
  providedIn: 'root'
})
export class HelpService {

  keyboardShortcutsTemplate?: TemplateRef<{}>;

  private helpPopoverRef?: PopoverRef;

  constructor(private readonly popover: PopoverService) {
  }

  showKeyboardShortcuts(): void {
    if (!this.keyboardShortcutsTemplate || this.helpPopoverRef) {
      return;
    }

    this.helpPopoverRef = this.popover.open(this.keyboardShortcutsTemplate, null, {data: '?'});

    this.helpPopoverRef.afterClosed().subscribe(() => {
      this.helpPopoverRef = undefined;
    });
  }

}
