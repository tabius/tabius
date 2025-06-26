import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { I18N } from '@app/app-i18n';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'gt-loading-indicator',
    templateUrl: './loading-indicator.component.html',
    styleUrls: ['./loading-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class LoadingIndicatorComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly i18n = I18N.loadingIndicatorWarning;
  isReloadWarningVisible = false;

  constructor() {
    timer(15_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.isReloadWarningVisible = true;
        this.cdr.markForCheck();
      });
  }

  onReloadButtonClicked(): void {
    location.reload();
  }
}
