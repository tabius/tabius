import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { environment } from '@app/environments/environment';
import { Router } from '@angular/router';
import { I18N } from '@app/app-i18n';
import { LINK_CATALOG, LINK_SCENE, LINK_SETTINGS, LINK_STUDIO, LINK_TUNER } from '@common/mounts';
import { LocationStrategy } from '@angular/common';
import { BrowserStateService } from '@app/services/browser-state.service';
import {
  ContextMenuAction,
  ContextMenuActionService,
  isFunctionalTarget,
  isSubmenuTarget,
} from '@app/services/context-menu-action.service';
import { PopoverService } from '@app/popover/popover.service';
import { PopoverRef } from '@app/popover/popover-ref';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'gt-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class FooterComponent implements OnDestroy {
  readonly router = inject(Router);
  private readonly location = inject(LocationStrategy);
  private readonly bss = inject(BrowserStateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly contextMenuActionService = inject(ContextMenuActionService);
  private readonly popoverService = inject(PopoverService);

  readonly month = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(4, 6);
  readonly day = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(6, 8);

  readonly footerClass = `c${1 + (Date.now() % 5)}`;

  readonly domain = environment.domain;

  readonly githubLink = 'https://github.com/tabius/tabius/commits/master';
  readonly sceneLink = LINK_SCENE;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly tunerLink = LINK_TUNER;
  readonly settingsLink = LINK_SETTINGS;

  readonly i18n = I18N.footer;
  readonly i18nNav = I18N.navbar; //TODO:

  isMainMenuDrawerOpen = false;

  /** Current actions to show in the menu. */
  actions: ContextMenuAction[] = [];

  /** Parent menu stacks. */
  menuStack: Array<ContextMenuAction[]> = [];

  private actionMenuPopoverRef?: PopoverRef;

  constructor() {
    this.contextMenuActionService.footerActions$.pipe(takeUntilDestroyed()).subscribe(actions => {
      this.actions = actions;
      this.menuStack = [];
      this.cdr.markForCheck();
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

  activateAction(action: ContextMenuAction, event: MouseEvent): void {
    event.preventDefault();
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
    const prevActions = this.menuStack.pop();
    if (!prevActions) {
      return;
    }
    this.actions = prevActions;
    this.menuStack = [...this.menuStack];
  }
}
