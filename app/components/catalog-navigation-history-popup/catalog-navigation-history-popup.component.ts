import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input} from '@angular/core';
import {UserService} from '@app/services/user.service';
import {filter} from 'rxjs/operators';
import {CatalogNavigationHistoryStep} from '@common/user-model';
import {PopoverRef} from '@app/popover/popover-ref';
import {NavigationEnd, Router} from '@angular/router';
import {checkUpdateByShallowArrayCompare} from '@app/store';
import {I18N} from '@app/app-i18n';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractAppComponent} from '@app/utils/abstract-app-component';

@Component({
  selector: 'gt-catalog-navigation-history-popup',
  templateUrl: './catalog-navigation-history-popup.component.html',
  styleUrls: ['./catalog-navigation-history-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogNavigationHistoryPopupComponent extends AbstractAppComponent {

  @Input({required: true}) popover!: PopoverRef;

  private allSteps: CatalogNavigationHistoryStep[] = [];

  private currentUrl = '';

  visibleSteps: CatalogNavigationHistoryStep[] = [];

  readonly i18n = I18N.navigationHistoryPopup;

  constructor(private readonly uds: UserService,
              private readonly cd: ChangeDetectorRef,
              private readonly router: Router,
  ) {
    super();
    this.currentUrl = this.router.url;
    this.uds.getCatalogNavigationHistory().pipe(
        takeUntilDestroyed(),
    ).subscribe(history => {
      this.allSteps = history.steps;
      this.updateVisibleSteps(history.steps, this.currentUrl);
      this.cd.markForCheck();
    });
    this.router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(),
    ).subscribe(() => {
      this.updateVisibleSteps(this.allSteps, this.router.url);
      this.cd.markForCheck();
    });
  }

  private updateVisibleSteps(newAllSteps: CatalogNavigationHistoryStep[], newUrl: string): void {
    if (newUrl == this.currentUrl && checkUpdateByShallowArrayCompare(newAllSteps, this.allSteps)) {
      return;
    }
    this.allSteps = newAllSteps;
    this.currentUrl = newUrl;
    this.visibleSteps = this.allSteps.filter(s => s.url !== this.currentUrl);
    this.visibleSteps.reverse();
  }
}
