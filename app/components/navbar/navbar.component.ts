import {ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {User} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {Observable, Subject} from 'rxjs';
import {Router} from '@angular/router';
import {FORUM_LINK, MOUNT_ARTIST_PREFIX, MOUNT_ARTISTS, MOUNT_PLAYLIST_PREFIX, MOUNT_SONG_PREFIX, MOUNT_TUNER, MOUNT_USER_SETTINGS, MOUNT_USER_STUDIO} from '@common/mounts';
import {BrowserStateService} from '@app/services/browser-state.service';
import {UserDataService} from '@app/services/user-data.service';
import {ToastService} from '@app/toast/toast.service';

enum NavSection {
  Home = 1,
  Forum = 2,
  Artists = 3,
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

  readonly forumLink = FORUM_LINK;
  readonly artistsLink = MOUNT_ARTISTS;
  readonly studioLink = MOUNT_USER_STUDIO;
  readonly tunerLink = MOUNT_TUNER;
  readonly settingsLink = MOUNT_USER_SETTINGS;

  readonly NavSection = NavSection;
  readonly noSleepMode$: Observable<boolean>;

  constructor(private readonly uds: UserDataService,
              private readonly router: Router,
              private readonly bss: BrowserStateService,
              private readonly toast: ToastService,
              private readonly cd: ChangeDetectorRef,
  ) {
    this.noSleepMode$ = bss.getNoSleepMode$();
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
    if (url.startsWith(`/${MOUNT_TUNER}`)) {
      return NavSection.Tuner;
    } else if (url.startsWith(`/${MOUNT_ARTISTS}`) || url.startsWith(`/${MOUNT_ARTIST_PREFIX}`) || url.startsWith(`/${MOUNT_SONG_PREFIX}`)) {
      return NavSection.Artists;
    } else if (url.startsWith(`/${MOUNT_USER_STUDIO}`) || url.startsWith(`/${MOUNT_PLAYLIST_PREFIX}`)) {
      return NavSection.Studio;
    } else if (url.startsWith(`/${MOUNT_USER_SETTINGS}`)) {
      return NavSection.Settings;
    }
    return NavSection.Home;
  }

  /** Close menu on navigation. */
  @HostListener('window:popstate', ['$event'])
  onPopState() {
    if (this.opened) {
      this.close();
      this.cd.detectChanges();
    }
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
    if (!this.user) {
      return '-';
    }
    return this.user.username && this.user.username.length > 0 ? this.user.username.charAt(0).toUpperCase() : '+';
  }

  showUserInfo(): void {
    if (this.user) {
      this.toast.info(`Аккаунт: ${this.user.username}, ${this.user.email}`);
    } else {
      this.toast.info('Вы не вошли в систему');
    }
  }
}
