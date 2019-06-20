import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {Toast, ToastRef} from '@app/toast/toast-model';
import {animate, AnimationTriggerMetadata, state, style, transition, trigger} from '@angular/animations';

type ToastAnimationState = 'default'|'closing';

const toastAnimations: { readonly fadeToast: AnimationTriggerMetadata } = {

  fadeToast: trigger('fadeAnimation', [
    state('default', style({opacity: 1})),
    transition('void => *', [style({opacity: 0}), animate('{{ fadeIn }}ms')]),
    transition('default => closing', animate('{{ fadeOut }}ms', style({opacity: 0})),
    ),
  ]),
};

@Component({
  selector: 'gt-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  animations: [toastAnimations.fadeToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent implements OnInit, OnDestroy {
  animationState: ToastAnimationState = 'default';
  private intervalId!: number;

  constructor(readonly toast: Toast,
              private readonly ref: ToastRef,
              private readonly cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.intervalId = window.setTimeout(() => {
      this.animationState = 'closing';
      this.cd.detectChanges();
    }, 4000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.intervalId);
  }

  close(): void {
    this.ref.close();
  }

  onFadeFinished(event: AnimationEvent): void {
    const {toState} = event as any;
    const isFadeOut = (toState as ToastAnimationState) === 'closing';
    const itFinished = this.animationState === 'closing';
    if (isFadeOut && itFinished) {
      this.close();
    }
  }
}
