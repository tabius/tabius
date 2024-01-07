import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';

import { ToastComponent } from './toast.component';

@NgModule({
  imports: [OverlayModule],
  declarations: [ToastComponent],
  exports: [ToastComponent],
})
export class ToastModule {}
