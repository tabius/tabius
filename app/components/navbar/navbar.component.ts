import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {User} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {Observable, Subject} from 'rxjs';
import {Router} from '@angular/router';
import {UserSessionState} from '@app/store/user-session-state';
import {FORUM_LINK, MOUNT_ARTIST_PREFIX, MOUNT_ARTISTS, MOUNT_PLAYLIST_PREFIX, MOUNT_SONG_PREFIX, MOUNT_TUNER, MOUNT_USER_PLAYLISTS, MOUNT_USER_SETTINGS} from '@common/mounts';
import {BrowserStateService} from '@app/services/browser-state.service';

enum NavSection {
  Home = 1,
  Forum = 2,
  Artists = 3,
  Playlists = 4,
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
  readonly playlistsLink = MOUNT_USER_PLAYLISTS;
  readonly tunerLink = MOUNT_TUNER;
  readonly settingsLink = MOUNT_USER_SETTINGS;

  readonly NavSection = NavSection;
  readonly noSleepMode$: Observable<boolean>;

  constructor(private readonly session: UserSessionState,
              private readonly router: Router,
              private readonly bss: BrowserStateService,
              private readonly cd: ChangeDetectorRef,
  ) {
    this.noSleepMode$ = bss.getNoSleepMode$();
  }

  ngOnInit() {
    this.session.user$
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
    } else if (url.startsWith(`/${MOUNT_USER_PLAYLISTS}`) || url.startsWith(`/${MOUNT_PLAYLIST_PREFIX}`)) {
      return NavSection.Playlists;
    } else if (url.startsWith(`/${MOUNT_USER_SETTINGS}`)) {
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
    if (!this.user) {
      return '-';
    }
    return this.user.name.length > 0 ? this.user.name.charAt(0).toUpperCase() : '+';
  }
}
