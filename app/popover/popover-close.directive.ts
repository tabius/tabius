import { Directive, HostListener, Input, Optional } from '@angular/core';

import { PopoverRef } from './popover-ref';

/**
 * Button that will close the current popover.
 *
 * Note: should not be used within templates!
 */
@Directive({
  selector: '[gt-popoverClose]',
})
export class PopoverCloseDirective<T = any> {
  @Input('gt-popoverClose') popoverResult!: T;

  constructor(@Optional() private popoverRef: PopoverRef<T>) {}

  @HostListener('click') onClick(): void {
    if (!this.popoverRef) {
      console.error('gt-popoverClose is not supported within a template');
      return;
    }
    this.popoverRef.close(this.popoverResult);
  }
}
