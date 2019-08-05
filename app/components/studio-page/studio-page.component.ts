import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {UserDataService} from '@app/services/user-data.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {Playlist, User} from '@common/user-model';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {getArtistPageLink, getPlaylistPageLink} from '@common/util/misc-utils';
import {MOUNT_USER_SETTINGS} from '@common/mounts';
import {Artist} from '@common/artist-model';
import {ArtistDataService} from '@app/services/artist-data.service';
import {NODE_BB_LOGIN_URL, NODE_BB_REGISTRATION_URL} from '@common/constants';
import {RefreshMode} from '@app/store/observable-store';

@Component({
  selector: 'gt-studio-page',
  templateUrl: './studio-page.component.html',
  styleUrls: ['./studio-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudioPageComponent implements OnInit, OnDestroy {

  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  readonly getPlaylistPageLink = getPlaylistPageLink;
  readonly settingsLink = `/${MOUNT_USER_SETTINGS}`;
  readonly loginLink = NODE_BB_LOGIN_URL;
  readonly registrationLink = NODE_BB_REGISTRATION_URL;

  loaded = false;
  playlists: Playlist[] = [];
  user?: User;
  artist?: Artist;

  constructor(private readonly uds: UserDataService,
              private readonly ads: ArtistDataService,
              readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,) {
  }


  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    const playlists$ = this.uds.getUserPlaylists(RefreshMode.Refresh);
    const user$ = this.uds.getUser();
    const artist$ = user$.pipe(flatMap(user => this.ads.getArtistById(user && user.artistId)));
    combineLatest([playlists$, user$, artist$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([playlists, user, artist]) => {
          this.loaded = true;
          this.playlists = playlists;
          this.user = user;
          this.artist = artist;
          this.cd.detectChanges();
        });
    this.updateMeta();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    updatePageMetadata(this.title, this.meta, {
      title: 'Плейлисты',
      description: 'Список персональных плейлистов.',
      keywords: ['табы', 'гитара', 'аккорды', 'плейлист'],
    });
  }

  getUserArtistPageLink(): string {
    return !this.artist ? '/' : getArtistPageLink(this.artist.mount);
  }
}
