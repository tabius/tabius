import {Component, OnDestroy, OnInit} from '@angular/core';
import {User} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {Router} from '@angular/router';
import {UserSessionState} from '@app/store/user-session-state';
import {FORUM_LINK, MOUNT_ARTIST_PREFIX, MOUNT_ARTISTS, MOUNT_PLAYLIST_PREFIX, MOUNT_SONG_PREFIX, MOUNT_TUNER, MOUNT_USER_PLAYLISTS, MOUNT_USER_SETTINGS} from '@common/mounts';

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

  constructor(private readonly session: UserSessionState, private router: Router) {
  }

  ngOnInit() {
    this.session.user$
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => this.user = user);
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
}
