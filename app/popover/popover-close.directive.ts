import { Directive, HostListener, Input, inject } from '@angular/core';

import { PopoverRef } from './popover-ref';
import { POPOVER_REF } from '@app/popover/popover.service';

/**
 * Button that will close the current popover.
 *
 * Note: should not be used within templates!
 */
@Directive({
    selector: '[gt-popoverClose]',
    standalone: false
})
export class PopoverCloseDirective<T = unknown> {
  private popoverRef = inject<PopoverRef<T>>(POPOVER_REF, { optional: true });

  @Input('gt-popoverClose') popoverResult!: T;

  @HostListener('click') onClick(): void {
    if (!this.popoverRef) {
      console.error('gt-popoverClose is not supported within a template');
      return;
    }
    this.popoverRef.close(this.popoverResult);
  }
}
