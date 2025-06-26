import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { Toast, ToastRef } from '@app/toast/toast-model';
import { animate, AnimationTriggerMetadata, state, style, transition, trigger } from '@angular/animations';

type ToastAnimationState = 'default' | 'closing';

const toastAnimations: { readonly fadeToast: AnimationTriggerMetadata } = {
  fadeToast: trigger('fadeAnimation', [
    state('default', style({ opacity: 1 })),
    transition('void => *', [style({ opacity: 0 }), animate('{{ fadeIn }}ms')]),
    transition('default => closing', animate('{{ fadeOut }}ms', style({ opacity: 0 }))),
  ]),
};

@Component({
    selector: 'gt-toast',
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    animations: [toastAnimations.fadeToast],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ToastComponent implements OnDestroy {
  readonly toast = inject(Toast);
  private readonly ref = inject(ToastRef);
  private readonly cdr = inject(ChangeDetectorRef);

  animationState: ToastAnimationState = 'default';
  private readonly intervalId: number;

  constructor() {
    this.intervalId = window.setTimeout(() => {
      this.animationState = 'closing';
      this.cdr.markForCheck();
    }, 4000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.intervalId);
  }

  close(): void {
    this.ref.close();
  }

  onFadeFinished(event: AnimationEvent): void {
    const toState = (event as any).toState as ToastAnimationState;
    const isFadeOut = toState === 'closing';
    const itFinished = this.animationState === 'closing';
    if (isFadeOut && itFinished) {
      this.close();
    }
  }
}
