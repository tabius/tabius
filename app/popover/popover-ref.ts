import {ConnectedOverlayPositionChange, FlexibleConnectedPositionStrategy, OverlayRef, PositionStrategy} from '@angular/cdk/overlay';
import {Observable, of, Subject} from 'rxjs';
import {filter} from 'rxjs/operators';

import {PopoverConfig} from './popover-config';

/**
 * Reference to a popover opened via the Popover service.
 */
export class PopoverRef<T = any> {

  private afterClosed$ = new Subject<T>();

  constructor(private overlayRef: OverlayRef,
              private positionStrategy: PositionStrategy,
              public config: PopoverConfig) {

    if (!config.disableClose) {
      this.overlayRef.backdropClick().subscribe(() => {
        this.close();
      });

      this.overlayRef.keydownEvents()
          .pipe(filter(event => event.key === 'Escape'))
          .subscribe((event) => {
            event.stopPropagation();
            this.close();
          });
    }
  }

  close(dialogResult?: T): void {
    this.afterClosed$.next(dialogResult);
    this.afterClosed$.complete();
    this.overlayRef.dispose();
  }

  afterClosed(): Observable<T> {
    return this.afterClosed$.asObservable();
  }

  positionChanges(): Observable<ConnectedOverlayPositionChange> {
    return this.positionStrategy instanceof FlexibleConnectedPositionStrategy
        ? this.positionStrategy.positionChanges
        : of();
  }
}
