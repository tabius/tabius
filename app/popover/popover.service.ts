import {ComponentType, ConnectionPositionPair, FlexibleConnectedPositionStrategyOrigin, Overlay, PositionStrategy} from '@angular/cdk/overlay';
import {ComponentPortal, PortalInjector, TemplatePortal} from '@angular/cdk/portal';
import {Injectable, InjectionToken, Injector, TemplateRef} from '@angular/core';

import {PopoverConfig} from './popover-config';
import {PopoverRef} from './popover-ref';
import {PopoverComponent} from './popover.component';

/**
 * Injection token that can be used to access the data that was passed in to a popover.
 *
 * Original code: https://stackblitz.com/edit/cdk-popover-example-p1
 */
export const POPOVER_DATA = new InjectionToken('popover.data');

const defaultConfig: PopoverConfig = {
  backdropClass: '',
  disableClose: false,
  panelClass: '',
  arrowOffset: 30,
  arrowSize: 20
};

/**
 * Service to open modal and manage popovers.
 */
@Injectable({
  providedIn: 'root'
})
export class PopoverService {
  constructor(private readonly overlay: Overlay, private readonly injector: Injector) {
  }

  open<D = any>(componentOrTemplate: ComponentType<any>|TemplateRef<any>,
                target: FlexibleConnectedPositionStrategyOrigin|null,
                config: Partial<PopoverConfig> = {}): PopoverRef<D> {
    const popoverConfig: PopoverConfig = Object.assign({}, defaultConfig, config);

    const arrowSize = popoverConfig.arrowSize;
    const arrowOffset = popoverConfig.arrowOffset;
    const panelOffset = arrowSize / 2;

    // preferred positions, in order of priority
    const positions: ConnectionPositionPair[] = [
      // top center
      {
        overlayX: 'center',
        overlayY: 'bottom',
        originX: 'center',
        originY: 'top',
        panelClass: ['bottom', 'center'],
        offsetY: -1 * panelOffset
      },
      // top left
      {
        overlayX: 'start',
        overlayY: 'bottom',
        originX: 'center',
        originY: 'top',
        panelClass: ['bottom', 'left'],
        offsetX: -1 * arrowOffset,
        offsetY: -1 * panelOffset
      },
      // top right
      {
        overlayX: 'end',
        overlayY: 'bottom',
        originX: 'center',
        originY: 'top',
        panelClass: ['bottom', 'right'],
        offsetX: arrowOffset,
        offsetY: -1 * panelOffset
      },
      // bottom center
      {
        overlayX: 'center',
        overlayY: 'top',
        originX: 'center',
        originY: 'bottom',
        panelClass: ['top', 'center'],
        offsetY: panelOffset
      },
      // bottom left
      {
        overlayX: 'start',
        overlayY: 'top',
        originX: 'center',
        originY: 'bottom',
        panelClass: ['top', 'left'],
        offsetX: -1 * arrowOffset,
        offsetY: panelOffset
      },
      // bottom right
      {
        overlayX: 'end',
        overlayY: 'top',
        originX: 'center',
        originY: 'bottom',
        panelClass: ['top', 'right'],
        offsetX: arrowOffset,
        offsetY: panelOffset
      }
    ];

    const positionStrategy = this.buildPositionStrategy(target, positions);

    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: config.backdropClass,
      panelClass: config.panelClass,
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition()
    });

    const popoverRef = new PopoverRef(overlayRef, positionStrategy, popoverConfig);

    const popover = overlayRef.attach(new ComponentPortal(
        PopoverComponent,
        null,
        new PortalInjector(this.injector, new WeakMap<any, any>([[PopoverRef, popoverRef]]))
    )).instance;

    if (componentOrTemplate instanceof TemplateRef) {
      // rendering a provided template dynamically
      popover.attachTemplatePortal(
          new TemplatePortal(
              componentOrTemplate,
              null!, //TODO
              {
                $implicit: config.data,
                popover: popoverRef
              }
          )
      );
    } else {
      // rendering a provided component dynamically
      popover.attachComponentPortal(
          new ComponentPortal(
              componentOrTemplate,
              null,
              new PortalInjector(
                  this.injector,
                  new WeakMap<any, any>([[POPOVER_DATA, config.data], [PopoverRef, popoverRef]])
              )
          )
      );
    }

    return popoverRef;
  }

  private buildPositionStrategy(target: FlexibleConnectedPositionStrategyOrigin|null, positions: ConnectionPositionPair[]): PositionStrategy {
    if (target === null) {
      return this.overlay.position()
          .global()
          .centerHorizontally()
          .centerVertically();
    }
    return this.overlay
        .position()
        .flexibleConnectedTo(target)
        .withPush(false)
        .withFlexibleDimensions(false)
        .withPositions(positions);
  }
}
