import { ChangeDetectorRef, DestroyRef, Directive, HostBinding, inject, OnInit } from '@angular/core';

import { PopoverRef } from './popover-ref';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Internal directive that shows the popover arrow.
 */
@Directive({
  selector: '[gt-popoverArrow]',
})
export class PopoverArrowDirective implements OnInit {
  @HostBinding('style.width.px')
  @HostBinding('style.height.px')
  arrowSize: number | null = null;

  @HostBinding('style.top.px')
  offsetTop: number | null = null;

  @HostBinding('style.right.px')
  offsetRight: number | null = null;

  @HostBinding('style.bottom.px')
  offsetBottom: number | null = null;

  @HostBinding('style.left.px')
  offsetLeft: number | null = null;

  @HostBinding('style.display')
  display: string | null = null;

  protected readonly destroyRef = inject(DestroyRef);

  constructor(private readonly popoverRef: PopoverRef, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.arrowSize = this.popoverRef.config.arrowSize;
    if (this.arrowSize === 0) {
      this.display = 'none';
    }
    this.popoverRef
      .positionChanges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(p => {
        let { offsetX, offsetY } = p.connectionPair;
        [offsetX, offsetY] = [offsetX || 0, offsetY || 0]; // use 0 as default value.
        this.offsetTop = offsetY >= 0 ? offsetY * -1 : null;
        this.offsetLeft = offsetX < 0 ? offsetX * -1 : null;
        this.offsetBottom = offsetY < 0 ? offsetY : null;
        this.offsetRight = offsetX >= 0 ? offsetX : null;
        this.cdr.markForCheck();
      });
  }
}
