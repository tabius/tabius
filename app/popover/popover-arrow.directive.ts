import {ChangeDetectorRef, Directive, HostBinding, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';

import {PopoverRef} from './popover-ref';

/**
 * Internal directive that shows the popover arrow.
 */
@Directive({
  selector: '[gt-popoverArrow]'
})
export class PopoverArrowDirective implements OnInit {
  @HostBinding('style.width.px')
  @HostBinding('style.height.px')
  arrowSize: number|null = null;

  @HostBinding('style.top.px')
  offsetTop: number|null = null;

  @HostBinding('style.right.px')
  offsetRight: number|null = null;

  @HostBinding('style.bottom.px')
  offsetBottom: number|null = null;

  @HostBinding('style.left.px')
  offsetLeft: number|null = null;

  @HostBinding('style.display')
  display: string|null = null;

  private subscription!: Subscription;

  constructor(private readonly popoverRef: PopoverRef,
              private readonly cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.arrowSize = this.popoverRef.config.arrowSize;
    if (this.arrowSize === 0) {
      this.display = 'none';
    }

    this.subscription = this.popoverRef.positionChanges().subscribe(p => {
      let {offsetX, offsetY} = p.connectionPair;
      [offsetX, offsetY] = [offsetX || 0, offsetY || 0]; // use 0 as default value.
      this.offsetTop = offsetY >= 0 ? offsetY * -1 : null;
      this.offsetLeft = offsetX < 0 ? offsetX * -1 : null;
      this.offsetBottom = offsetY < 0 ? offsetY : null;
      this.offsetRight = offsetX >= 0 ? offsetX : null;
      this.cd.detectChanges();

    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
