import {OverlayModule} from '@angular/cdk/overlay';
import {PortalModule} from '@angular/cdk/portal';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {PopoverArrowDirective} from './popover-arrow.directive';
import {PopoverCloseDirective} from './popover-close.directive';
import {PopoverComponent} from './popover.component';

@NgModule({
  declarations: [PopoverComponent, PopoverCloseDirective, PopoverArrowDirective],
  imports: [
    CommonModule,
    OverlayModule,
    PortalModule
  ],
  exports: [
    PopoverCloseDirective
  ],
  entryComponents: [PopoverComponent]
})
export class PopoverModule {
}
