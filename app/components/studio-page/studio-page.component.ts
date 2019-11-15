import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {UserDataService} from '@app/services/user-data.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {User} from '@common/user-model';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {getCollectionPageLink} from '@common/util/misc-utils';
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

  readonly loginLink = NODE_BB_LOGIN_URL;
  readonly registrationLink = NODE_BB_REGISTRATION_URL;

  loaded = false;
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

    const user$ = this.uds.getUser();
    const collection$ = user$.pipe(flatMap(user => this.cds.getCollectionById(user && user.collectionId)));
    combineLatest([user$, collection$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([user, collection]) => {
          this.loaded = true;
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
