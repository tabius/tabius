import {Injectable, Injector} from '@angular/core';
import {Overlay} from '@angular/cdk/overlay';
import {ComponentPortal, PortalInjector} from '@angular/cdk/portal';

import {ToastComponent} from './toast.component';
import {Toast, ToastRef, ToastType} from '@app/toast/toast-model';
import {MSG_UNEXPECTED_ERROR} from '@common/messages';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private lastToast?: ToastRef;

  constructor(private overlay: Overlay,
              private parentInjector: Injector) {
  }

  warning(err: unknown, fallback = MSG_UNEXPECTED_ERROR): ToastRef {
    const message = typeof err === 'string' ? err : fallback;
    return this.show(message, 'warning');
  }

  info(text: string): ToastRef {
    return this.show(text, 'info');
  }

  show(text: string, type: ToastType): ToastRef {
    if (this.lastToast) {
      if (this.lastToast.isVisible()) {
        this.lastToast.close();
      }
      delete this.lastToast;
    }
    const overlayRef = this.overlay.create({panelClass: 'toast-overlay'});
    const toastRef = new ToastRef(overlayRef);
    const injector = getInjector({text, type}, toastRef, this.parentInjector);
    overlayRef.attach(new ComponentPortal(ToastComponent, null, injector));
    this.lastToast = toastRef;
    return toastRef;
  }
}

function getInjector(toast: Toast, toastRef: ToastRef, parentInjector: Injector): PortalInjector {
  const tokens = new WeakMap();
  tokens.set(Toast, toast);
  tokens.set(ToastRef, toastRef);
  return new PortalInjector(parentInjector, tokens);
}
