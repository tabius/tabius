import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {UserService} from '@app/services/user.service';
import {filter, takeUntil} from 'rxjs/operators';
import {CatalogNavigationHistoryStep} from '@common/user-model';
import {PopoverRef} from '@app/popover/popover-ref';
import {NavigationEnd, Router} from '@angular/router';
import {Subject} from 'rxjs';
import {checkUpdateByShallowArrayCompare} from '@app/store';

@Component({
  selector: 'gt-catalog-navigation-history-popup',
  templateUrl: './catalog-navigation-history-popup.component.html',
  styleUrls: ['./catalog-navigation-history-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogNavigationHistoryPopupComponent implements OnInit, OnDestroy {

  @Input() popover!: PopoverRef;

  private readonly destroyed$ = new Subject();

  private allSteps: CatalogNavigationHistoryStep[] = [];

  private currentUrl = '';

  visibleSteps: CatalogNavigationHistoryStep[] = [];

  constructor(private readonly uds: UserService,
              private readonly cd: ChangeDetectorRef,
              private router: Router,
  ) {
  }

  ngOnInit(): void {
    this.currentUrl = this.router.url;
    this.uds.getCatalogNavigationHistory().pipe(takeUntil(this.destroyed$)).subscribe(history => {
      this.allSteps = history.steps;
      this.updateVisibleSteps(history.steps, this.currentUrl);
      this.cd.detectChanges();
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroyed$)).subscribe(() => {
      this.updateVisibleSteps(this.allSteps, this.router.url);
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
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
