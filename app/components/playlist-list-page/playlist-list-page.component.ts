import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {throttleIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {UserDataService} from '@app/services/user-data.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {Playlist} from '@common/user-model';
import {BehaviorSubject, Subject} from 'rxjs';
import {takeUntil, throttleTime} from 'rxjs/operators';
import {getPlaylistPageLink} from '@common/util/misc-utils';
import {MOUNT_USER_SETTINGS} from '@common/mounts';

@Component({
  selector: 'gt-playlist-list-page',
  templateUrl: './playlist-list-page.component.html',
  styleUrls: ['./playlist-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistListPageComponent implements OnInit, OnDestroy {

  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  readonly getPlaylistPageLink = getPlaylistPageLink;
  readonly settingsLink = `/${MOUNT_USER_SETTINGS}`;

  loaded = false;
  playlists: Playlist[] = [];

  constructor(private readonly uds: UserDataService,
              readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,) {
  }


  ngOnInit() {
    throttleIndicator(this);
    this.uds.getUserPlaylists()
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(playlists => {
          this.loaded = true;
          this.playlists = playlists;
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


}
