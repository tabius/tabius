import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {UserDataService} from '@app/services/user-data.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {User} from '@common/user-model';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {Collection, CollectionDetails, Song} from '@common/catalog-model';
import {defined, sortSongsAlphabetically} from '@common/util/misc-utils';

@Component({
  selector: 'gt-studio-page',
  templateUrl: './studio-page.component.html',
  styleUrls: ['./studio-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudioPageComponent implements OnInit, OnDestroy {

  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  loaded = false;
  user?: User;
  collection?: Collection;
  songs: Song[] = [];

  editorIsOpen = false;

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
    const collectionDetails$: Observable<CollectionDetails|undefined> = user$.pipe(flatMap(user => this.cds.getCollectionDetails(user && user.collectionId)));
    const songs$: Observable<Song[]> = collection$.pipe(
        flatMap(collection => this.cds.getCollectionSongList(collection && collection.id)),
        flatMap(songIds => this.cds.getSongsByIds(songIds || [])),
        map(songs => songs.filter(defined))
    );
    combineLatest([user$, collection$, collectionDetails$, songs$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([user, collection, collectionDetails, songs]) => {
          this.loaded = true;
          if (!user || !collection || !collectionDetails || !songs) {
            //TODO: switchToNotFoundMode(this);
            this.cd.detectChanges();
            return;
          }
          this.user = user;
          this.collection = collection;
          this.songs = sortSongsAlphabetically(songs);
          this.cd.detectChanges();
        });
    this.updateMeta();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    updatePageMetadata(this.title, this.meta, {
      title: 'Студия: мои подборы',
      description: 'Список персональных подборов.',
      keywords: ['табы', 'гитара', 'аккорды', 'плейлист'],
    });
  }

  toggleEditor(): void {
    this.editorIsOpen = !this.editorIsOpen;
    this.cd.detectChanges();
  }
}
