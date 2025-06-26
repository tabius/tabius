import { Injectable, Injector, inject } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

import { ToastComponent } from './toast.component';
import { Toast, ToastRef, ToastType } from '@app/toast/toast-model';
import { I18N } from '@app/app-i18n';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private overlay = inject(Overlay);
  private parentInjector = inject(Injector);

  private lastToast?: ToastRef;

  warning(err: unknown, fallback = I18N.common.unexpectedError): ToastRef {
    const message = typeof err === 'string' ? err : fallback;
    return this.show(message, 'warning');
  }

  info(text: string): ToastRef {
    return this.show(text, 'info');
  }

  show(text: string, type: ToastType): ToastRef {
    if (this.lastToast?.isVisible()) {
      this.lastToast.close();
      delete this.lastToast;
    }
    const overlayRef = this.overlay.create({ panelClass: 'toast-overlay' });
    const toastRef = new ToastRef(overlayRef);

    const injector = Injector.create({
      parent: this.parentInjector,
      providers: [
        { provide: Toast, useValue: { text, type } },
        { provide: ToastRef, useValue: toastRef },
      ],
    });

    overlayRef.attach(new ComponentPortal(ToastComponent, undefined, injector));
    this.lastToast = toastRef;
    return toastRef;
  }
}
