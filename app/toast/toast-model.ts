import {OverlayRef} from '@angular/cdk/overlay';

export type ToastType = 'warning'|'info'|'success';

export class Toast {
  type: ToastType = 'warning';
  text = '';
}

export class ToastRef {
  constructor(private readonly overlay: OverlayRef) {
  }

  isVisible(): boolean {
    return this.overlay.overlayElement !== undefined;
  }

  close(): void {
    this.overlay.dispose();
  }
}
