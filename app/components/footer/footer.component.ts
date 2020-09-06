import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {environment} from '@app/environments/environment';
import {Router} from '@angular/router';
import {I18N} from '@app/app-i18n';
import {NODE_BB_URL} from '@app/app-constants';
import {LINK_CATALOG, LINK_SETTINGS, LINK_STUDIO, LINK_TUNER} from '@common/mounts';
import {LocationStrategy} from '@angular/common';
import {BrowserStateService} from '@app/services/browser-state.service';
import {ContextMenuAction, ContextMenuActionService, isFunctionalTarget, isSubmenuTarget} from '@app/services/context-menu-action.service';
import {Subject} from 'rxjs';
import {PopoverService} from '@app/popover/popover.service';
import {PopoverRef} from '@app/popover/popover-ref';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'gt-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent implements OnInit, OnDestroy {

  readonly month = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(4, 6);
  readonly day = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(6, 8);

  readonly footerClass = `c${1 + Date.now() % 5}`;

  readonly domain = environment.domain;

  readonly twitterLink = environment.domain === 'tabius.ru' || environment.domain === 'localhost'
                         ? 'https://twitter.com/tratatabius'
                         : undefined;

  readonly githubLink = 'https://github.com/tabius/tabius/commits/master';
  readonly forumLink = NODE_BB_URL;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly tunerLink = LINK_TUNER;
  readonly settingsLink = LINK_SETTINGS;


  readonly i18n = I18N.footer;
  readonly i18nNav = I18N.navbar;//TODO:

  isMainMenuDrawerOpen = false;

  /** Current actions to show in the menu. */
  actions: ContextMenuAction[] = [];

  /** Parent menu stacks. */
  menuStack: Array<ContextMenuAction[]> = [];

  private actionMenuPopoverRef?: PopoverRef;

  readonly defaultMenuIconSize = 24;
  readonly destroyed$ = new Subject<void>();

  constructor(readonly router: Router,
              private readonly location: LocationStrategy,
              private readonly bss: BrowserStateService,
              private readonly cdr: ChangeDetectorRef,
              private readonly contextMenuActionService: ContextMenuActionService,
              private readonly popoverService: PopoverService,
  ) {
  }

  ngOnInit(): void {
    this.contextMenuActionService.footerActions$.pipe(takeUntil(this.destroyed$)).subscribe(actions => {
      this.actions = actions;
      this.menuStack = [];
      this.cdr.detectChanges();
    });
    this.location.onPopState(() => {
      // Closes opened navbar on back button click on mobile device.
      // Warning: this solution does not work for the first page in PWA!
      if (this.isMainMenuDrawerOpen) {
        this.closeMainMenuDrawer();
        window.history.forward(); // Restore the current page.
      }
    });
  }

  ngOnDestroy(): void {
    this.closeMenuPopover();
    this.destroyed$.next();
  }

  openMainMenuDrawer(): void {
    if (!this.isMainMenuDrawerOpen) {
      this.isMainMenuDrawerOpen = true;
      this.cdr.markForCheck();
    }
  }

  closeMainMenuDrawer(): void {
    if (this.isMainMenuDrawerOpen) {
      this.isMainMenuDrawerOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleNoSleep(): void {
    this.bss.toggleNoSleepMode();
  }

  private closeMenuPopover(): void {
    if (this.actionMenuPopoverRef) {
      this.actionMenuPopoverRef.close();
      this.actionMenuPopoverRef = undefined;
    }
  }

  activateAction(action: ContextMenuAction): void {
    if (isSubmenuTarget(action.target)) {
      this.menuStack.push(this.actions);
      this.actions = action.target;
    } else if (isFunctionalTarget(action.target)) {
      action.target();
    } else {
      this.closeMenuPopover();
      this.actionMenuPopoverRef = this.popoverService.open(action.target, null, {
        backdropClass: 'c-popover-backdrop-modal',
        panelClass: 'c-popover-panel',
      });
      this.actionMenuPopoverRef.afterClosed().subscribe(() => {
        this.actionMenuPopoverRef = undefined;
      });
    }
  }

  popMenuState(): void {
    if (this.menuStack.length === 0) {
      return;
    }
    this.actions = this.menuStack.pop()!;
    this.menuStack = [...this.menuStack];
  }
}
