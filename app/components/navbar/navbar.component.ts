import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {User} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {Observable, Subject} from 'rxjs';
import {Router} from '@angular/router';
import {LINK_CATALOG, LINK_SETTINGS, LINK_STUDIO, LINK_TUNER, MOUNT_COLLECTION_PREFIX, MOUNT_SONG_PREFIX} from '@common/mounts';
import {BrowserStateService} from '@app/services/browser-state.service';
import {UserDataService} from '@app/services/user-data.service';
import {ToastService} from '@app/toast/toast.service';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {LocationStrategy} from '@angular/common';
import {NODE_BB_URL} from '@common/constants';

enum NavSection {
  Home = 1,
  Forum = 2,
  Catalog = 3,
  Studio = 4,
  Tuner = 5,
  Settings = 6
}

@Component({
  selector: 'gt-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {

  private readonly destroyed$ = new Subject();
  user?: User;
  opened = false;

  readonly forumLink = NODE_BB_URL;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly tunerLink = LINK_TUNER;
  readonly settingsLink = LINK_SETTINGS;

  readonly NavSection = NavSection;
  readonly noSleepMode$: Observable<boolean>;

  constructor(private readonly uds: UserDataService,
              private readonly router: Router,
              private readonly bss: BrowserStateService,
              private readonly toast: ToastService,
              private readonly navHelper: RoutingNavigationHelper,
              private readonly cd: ChangeDetectorRef,
              private location: LocationStrategy
  ) {
    this.noSleepMode$ = bss.getNoSleepMode$();
    this.location.onPopState(() => {
      // Closes opened navbar on back button on mobile device.
      if (this.opened) {
        this.close();
        window.history.go(1);
      }
    });
  }

  ngOnInit() {
    this.uds.getUser()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.user = user;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  //todo: make an utility in routing module.
  getActiveSection(): NavSection {
    const url = this.router.url.toLocaleLowerCase();
    if (url.startsWith(LINK_TUNER)) {
      return NavSection.Tuner;
    } else if (url.startsWith(LINK_CATALOG) || url.startsWith(`/${MOUNT_COLLECTION_PREFIX}`) || url.startsWith(`/${MOUNT_SONG_PREFIX}`)) {
      return NavSection.Catalog;
    } else if (url.startsWith(LINK_STUDIO)) {
      return NavSection.Studio;
    } else if (url.startsWith(LINK_SETTINGS)) {
      return NavSection.Settings;
    }
    return NavSection.Home;
  }

  open() {
    this.opened = true;
  }

  close() {
    this.opened = false;
  }

  toggleNoSleep(): void {
    this.bss.toggleNoSleepMode();
  }

  getUserIconText(): string {
    const {user} = this;
    if (!user) {
      return '-';
    }
    return user.username && user.username.length > 0 ? user.username.charAt(0).toUpperCase() : '+';
  }

  showUserInfo(): void {
    if (this.user) {
      this.toast.info(`Аккаунт: ${this.user.username}, ${this.user.email}`);
    } else {
      this.toast.info('Вы не вошли в систему');
    }
  }

  resetCollectionPageScroll(): void {
    this.navHelper.resetSavedScrollPosition(this.catalogLink);
    if (this.router.url === this.catalogLink) {
      window.scroll({top: 0, left: 0, behavior: 'smooth'});
    }
  }
}
