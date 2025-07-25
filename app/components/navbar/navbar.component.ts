import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { User } from '@common/user-model';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import {
  LINK_CATALOG,
  LINK_SCENE,
  LINK_SETTINGS,
  LINK_STUDIO,
  LINK_TUNER,
  MOUNT_COLLECTION_PREFIX,
  MOUNT_SONG_PREFIX,
} from '@common/mounts';
import { UserService } from '@app/services/user.service';
import { ToastService } from '@app/toast/toast.service';
import { RoutingNavigationHelper } from '@app/services/routing-navigation-helper.service';
import { I18N } from '@app/app-i18n';
import { USER_COLLECTION_MOUNT_SEPARATOR } from '@common/common-constants';
import { ContextMenuAction, ContextMenuActionService } from '@app/services/context-menu-action.service';
import { BrowserStateService } from '@app/services/browser-state.service';
import { CatalogNavigationHistoryService } from '@app/services/catalog-navigation-history.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientAuthService } from '@app/services/client-auth.service';

enum NavSection {
  Home = 1,
  Catalog = 2,
  Scene = 3,
  Studio = 4,
  Tuner = 5,
  Settings = 6,
}

@Component({
  selector: 'gt-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class NavbarComponent {
  readonly authService = inject(ClientAuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly navHelper = inject(RoutingNavigationHelper);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly bss = inject(BrowserStateService);
  private readonly navigationHistoryService = inject(CatalogNavigationHistoryService);

  user?: User;

  readonly sceneLink = LINK_SCENE;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly tunerLink = LINK_TUNER;
  readonly settingsLink = LINK_SETTINGS;

  readonly NavSection = NavSection;
  readonly i18n = I18N.navbar;
  readonly I18N = I18N;

  /** Extra action used in mobile mode only. */
  contextMenuAction?: ContextMenuAction;

  readonly noSleepMode$: Observable<boolean>;

  @ViewChild('showHistoryButton', { static: true, read: ElementRef }) private showHistoryButton?: ElementRef;

  constructor() {
    const bss = this.bss;
    const contextMenuActionService = inject(ContextMenuActionService);

    this.noSleepMode$ = bss.getNoSleepMode$();
    contextMenuActionService.navbarAction$.pipe(takeUntilDestroyed()).subscribe(action => {
      this.contextMenuAction = action;
    });
    this.userService
      .getUser$()
      .pipe(takeUntilDestroyed())
      .subscribe(user => {
        this.user = user;
        this.cdr.markForCheck();
      });

    this.router.events.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  // TODO: make an utility in the routing module.
  get activeSection(): NavSection {
    const url = this.router.url.toLocaleLowerCase();
    if (url.startsWith(LINK_SCENE)) {
      return NavSection.Scene;
    } else if (url.startsWith(LINK_TUNER)) {
      return NavSection.Tuner;
    } else if (
      url.startsWith(LINK_CATALOG) ||
      url.startsWith(`/${MOUNT_COLLECTION_PREFIX}`) ||
      url.startsWith(`/${MOUNT_SONG_PREFIX}`)
    ) {
      if (url.includes(USER_COLLECTION_MOUNT_SEPARATOR)) {
        return NavSection.Studio;
      }
      return NavSection.Catalog;
    } else if (url.startsWith(LINK_STUDIO)) {
      return NavSection.Studio;
    } else if (url.startsWith(LINK_SETTINGS)) {
      return NavSection.Settings;
    }
    return NavSection.Home;
  }

  getUserIconText(): string {
    const { user } = this;
    return user ? user.email.charAt(0).toUpperCase() : '-';
  }

  showUserInfo(): void {
    if (this.user) {
      this.toast.info(this.i18n.accountInfoToast(this.user));
    } else {
      this.toast.info(this.i18n.accountInfoNotLoggedInToast);
    }
  }

  resetCollectionPageScroll(): void {
    this.navHelper.resetSavedScrollPosition(this.catalogLink);
    if (this.router.url === this.catalogLink) {
      window.scroll({ top: 0, left: 0, behavior: 'smooth' });
    }
  }

  toggleNoSleep(): void {
    this.bss.toggleNoSleepMode();
  }

  activateContextMenuAction(): void {
    if (this.contextMenuAction && typeof this.contextMenuAction.target === 'function') {
      this.contextMenuAction.target();
    }
  }

  onShowHistoryClicked($event: MouseEvent): void {
    $event.preventDefault();
    // Style history.
    // Show right under the button.
    this.navigationHistoryService.showCatalogNavigationHistory(this.showHistoryButton);
  }
}
