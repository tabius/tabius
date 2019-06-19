import {Injectable, Injector} from '@angular/core';
import {Overlay} from '@angular/cdk/overlay';
import {ComponentPortal, PortalInjector} from '@angular/cdk/portal';

import {ToastComponent} from './toast.component';
import {Toast, ToastRef, ToastType} from '@app/toast/toast-model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private overlay: Overlay,
              private parentInjector: Injector) {
  }

  warning(text: string): ToastRef {
    return this.show(text, 'warning');
  }

  show(text: string, type: ToastType): ToastRef {
    const overlayRef = this.overlay.create({panelClass: 'toast-overlay'});
    const toastRef = new ToastRef(overlayRef);
    const injector = getInjector({text, type}, toastRef, this.parentInjector);
    overlayRef.attach(new ComponentPortal(ToastComponent, null, injector));
    return toastRef;
  }
}

function getInjector(toast: Toast, toastRef: ToastRef, parentInjector: Injector): PortalInjector {
  const tokens = new WeakMap();
  tokens.set(Toast, toast);
  tokens.set(ToastRef, toastRef);
  return new PortalInjector(parentInjector, tokens);
}
