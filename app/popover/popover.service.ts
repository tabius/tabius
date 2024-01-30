import {
  ComponentType,
  ConnectionPositionPair,
  FlexibleConnectedPositionStrategyOrigin,
  Overlay,
  PositionStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { Injectable, InjectionToken, Injector, TemplateRef } from '@angular/core';

import { PopoverConfig } from './popover-config';
import { PopoverRef } from './popover-ref';
import { PopoverComponent } from './popover.component';

const defaultConfig: PopoverConfig = {
  backdropClass: '',
  disableClose: false,
  panelClass: '',
  arrowOffset: 30,
  arrowSize: 20,
};

/** Injection token that can be used to access the popover reference. */
export const POPOVER_REF = new InjectionToken<Request>('POPOVER_REF');

/** Service to open a modal and manage popover state.*/
@Injectable({
  providedIn: 'root',
})
export class PopoverService {
  constructor(private readonly overlay: Overlay) {}

  open<D = unknown>(
    componentOrTemplate: ComponentType<unknown> | TemplateRef<unknown>,
    target: FlexibleConnectedPositionStrategyOrigin | null,
    config: Partial<PopoverConfig> = {},
  ): PopoverRef<D> {
    // Disable arrow rendering if there is no target element.
    const arrowSize = !!target ? config.arrowSize || defaultConfig.arrowSize : 0;
    const popoverConfig: PopoverConfig = { ...defaultConfig, ...config, arrowSize };
    const positionStrategy = this.buildPositionStrategy(target, popoverConfig);

    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: config.backdropClass,
      panelClass: config.panelClass,
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const popoverRef = new PopoverRef<D>(overlayRef, positionStrategy, popoverConfig);

    const popoverInjector = Injector.create({
      providers: [
        {
          provide: POPOVER_REF,
          useValue: popoverRef,
        },
      ],
    });

    const popover = overlayRef.attach(new ComponentPortal(PopoverComponent, null, popoverInjector)).instance;

    if (componentOrTemplate instanceof TemplateRef) {
      const templatePortal = new TemplatePortal(
        componentOrTemplate,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        null!,
        { $implicit: config.data, popover: popoverRef },
      );
      popover.attachTemplatePortal(templatePortal);
    } else {
      const componentPortal = new ComponentPortal(componentOrTemplate, null, popoverInjector);
      popover.attachComponentPortal(componentPortal);
    }
    return popoverRef;
  }

  private buildPositionStrategy(
    target: FlexibleConnectedPositionStrategyOrigin | null,
    popoverConfig: PopoverConfig,
  ): PositionStrategy {
    if (target === null) {
      return this.overlay.position().global().centerHorizontally().centerVertically();
    }
    const { arrowSize, arrowOffset } = popoverConfig;
    const popoverOffset = arrowSize / 2;

    // Preferred positions, in order of priority.
    // How to read: 'overlayX/Y' point touches 'originX/Y' point.
    // Example: center-bottom overlay point touches center-top point of the origin.
    const positions: ConnectionPositionPair[] = [
      {
        overlayX: 'center',
        overlayY: 'bottom',
        originX: 'center',
        originY: 'top',
        panelClass: ['bottom', 'center'],
        offsetY: -1 * popoverOffset,
      },
      {
        overlayX: 'start',
        overlayY: 'bottom',
        originX: 'center',
        originY: 'top',
        panelClass: ['bottom', 'left'],
        offsetX: -arrowOffset,
        offsetY: -1 * popoverOffset,
      },
      {
        overlayX: 'end',
        overlayY: 'bottom',
        originX: 'center',
        originY: 'top',
        panelClass: ['bottom', 'right'],
        offsetX: arrowOffset,
        offsetY: -1 * popoverOffset,
      },
      {
        overlayX: 'center',
        overlayY: 'top',
        originX: 'center',
        originY: 'bottom',
        panelClass: ['top', 'center'],
        offsetY: popoverOffset,
      },
      {
        overlayX: 'start',
        overlayY: 'top',
        originX: 'center',
        originY: 'bottom',
        panelClass: ['top', 'left'],
        offsetX: -arrowOffset,
        offsetY: popoverOffset,
      },
      {
        overlayX: 'end',
        overlayY: 'top',
        originX: 'center',
        originY: 'bottom',
        panelClass: ['top', 'right'],
        offsetX: arrowOffset,
        offsetY: popoverOffset,
      },
    ];

    if (popoverConfig.preferredPosition) {
      const { overlayX, overlayY } = popoverConfig.preferredPosition;
      positions.sort(p => (p.overlayX === overlayX && p.overlayY === overlayY ? -1 : 0));
    }

    return this.overlay
      .position()
      .flexibleConnectedTo(target)
      .withPush(false)
      .withFlexibleDimensions(false)
      .withPositions(positions);
  }
}
