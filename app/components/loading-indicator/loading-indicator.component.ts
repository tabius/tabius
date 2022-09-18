import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {I18N} from '@app/app-i18n';
import {takeUntil} from 'rxjs/operators';
import {Subject, timer} from 'rxjs';

@Component({
  selector: 'gt-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingIndicatorComponent implements OnInit, OnDestroy {
  readonly i18n = I18N.loadingIndicatorWarning;
  readonly destroyed$ = new Subject<boolean>();
  isReloadWarningVisible = false;

  constructor(private readonly cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    timer(15_000).pipe(takeUntil(this.destroyed$)).subscribe(() => {
      this.isReloadWarningVisible = true;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  onReloadButtonClicked(): void {
    location.reload();
  }

}
