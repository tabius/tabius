import {ChangeDetectorRef, Directive, HostBinding} from '@angular/core';
import {Subscription} from 'rxjs';

import {PopoverRef} from './popover-ref';

/**
 * Internal directive that shows the popover arrow.
 */
@Directive({
  selector: '[gt-popoverArrow]'
})
export class PopoverArrowDirective {
  @HostBinding('style.width.px')
  @HostBinding('style.height.px')
  arrowSize: number;

  @HostBinding('style.top.px')
  offsetTop: number|null = null;

  @HostBinding('style.right.px')
  offsetRight: number|null = null;

  @HostBinding('style.bottom.px')
  offsetBottom: number|null = null;

  @HostBinding('style.left.px')
  offsetLeft: number|null = null;

  private readonly subscription = new Subscription();

  constructor(private readonly popoverRef: PopoverRef,
              private readonly cd: ChangeDetectorRef) {

    this.arrowSize = popoverRef.config.arrowSize;

    this.subscription = popoverRef.positionChanges().subscribe(p => {
      const {offsetX, offsetY} = p.connectionPair;
      if (!!offsetX && !!offsetY) {
        this.offsetTop = offsetY >= 0 ? offsetY * -1 : null;
        this.offsetLeft = offsetX < 0 ? offsetX * -1 : null;
        this.offsetBottom = offsetY < 0 ? offsetY : null;
        this.offsetRight = offsetX >= 0 ? offsetX : null;
        this.cd.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
