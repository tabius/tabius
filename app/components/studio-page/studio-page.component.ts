import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {UserDataService} from '@app/services/user-data.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {Playlist, User} from '@common/user-model';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {getCollectionPageLink, getPlaylistPageLink} from '@common/util/misc-utils';
import {MOUNT_USER_SETTINGS} from '@common/mounts';
import {Collection} from '@common/catalog-model';
import {CatalogDataService} from '@app/services/catalog-data.service';
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
  collection?: Collection;

  constructor(private readonly uds: UserDataService,
              private readonly cds: CatalogDataService,
              readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,) {
  }


  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    const playlists$ = this.uds.getUserPlaylists(RefreshMode.Refresh);
    const user$ = this.uds.getUser();
    const collection$ = user$.pipe(flatMap(user => this.cds.getCollectionById(user && user.collectionId)));
    combineLatest([playlists$, user$, collection$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([playlists, user, collection]) => {
          this.loaded = true;
          this.playlists = playlists;
          this.user = user;
          this.collection = collection;
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

  getUserCollectionPageLink(): string {
    return !this.collection ? '/' : getCollectionPageLink(this.collection.mount);
  }
}
