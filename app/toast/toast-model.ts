import {OverlayRef} from '@angular/cdk/overlay';

export type ToastType = 'warning'|'info'|'success';

export class Toast {
  type: ToastType = 'warning';
  text: string = '';
}

export class ToastRef {
  constructor(private readonly overlay: OverlayRef) {
  }

  close(): void {
    this.overlay.dispose();
  }
}
