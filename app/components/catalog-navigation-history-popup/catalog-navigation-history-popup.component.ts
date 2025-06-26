import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { UserService } from '@app/services/user.service';
import { filter } from 'rxjs/operators';
import { CatalogNavigationHistoryStep } from '@common/user-model';
import { PopoverRef } from '@app/popover/popover-ref';
import { NavigationEnd, Router } from '@angular/router';
import { checkUpdateByShallowArrayCompare } from '@app/store';
import { I18N } from '@app/app-i18n';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';
import { trackByUrl } from '@common/util/misc-utils';
import { MOUNT_COLLECTION_PREFIX } from '@common/mounts';

@Component({
    selector: 'gt-catalog-navigation-history-popup',
    templateUrl: './catalog-navigation-history-popup.component.html',
    styleUrls: ['./catalog-navigation-history-popup.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class CatalogNavigationHistoryPopupComponent extends AbstractAppComponent {
  private readonly uds = inject(UserService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  @Input({ required: true }) popover!: PopoverRef;

  private allSteps: CatalogNavigationHistoryStep[] = [];

  private currentUrl = '';

  visibleSteps: CatalogNavigationHistoryStep[] = [];

  readonly i18n = I18N.navigationHistoryPopup;

  constructor() {
    super();
    this.currentUrl = this.router.url;
    this.uds
      .getCatalogNavigationHistory()
      .pipe(takeUntilDestroyed())
      .subscribe(history => {
        console.debug('steps', history.steps);
        this.allSteps = history.steps;
        this.updateVisibleSteps(history.steps, this.currentUrl);
        this.cd.markForCheck();
      });
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
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

  protected readonly trackByUrl = trackByUrl;

  isCollectionMount(url: string): boolean {
    console.log('url', url);
    return url.startsWith(`/${MOUNT_COLLECTION_PREFIX}`);
  }
}
