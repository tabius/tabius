import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {UserService} from '@app/services/user.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {User} from '@common/user-model';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {CatalogService} from '@app/services/catalog.service';
import {Song} from '@common/catalog-model';
import {sortSongsAndMounts} from '@app/components/collection-page/collection-page.component';
import {combineLatest0, defined} from '@common/util/misc-utils';

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

  /** Personal pick-ups. */
  songs: Song[] = [];
  primarySongCollectionMounts: (string|undefined)[] = [];

  editorIsOpen = false;

  constructor(private readonly uds: UserService,
              private readonly cds: CatalogService,
              readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,) {
  }


  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    const user$ = this.uds.getUser();
    const allUserCollectionIds$ = user$.pipe(flatMap(user => this.cds.getUserCollectionIds(user && user.id)));
    const allSongsInAllUserCollections$: Observable<Song[]> = allUserCollectionIds$.pipe(
        flatMap((collectionIds: number[]|undefined) =>
            combineLatest0((collectionIds || []).map(id => this.cds.getSongIdsByCollection(id)))),
        flatMap((songIdsArray: (number[]|undefined)[]) => {
          const uniqueSongIds = new Set<number>();
          for (const collectionSongIds of (songIdsArray || [])) {
            for (const songId of (collectionSongIds || [])) {
              uniqueSongIds.add(songId);
            }
          }
          return combineLatest0([...uniqueSongIds].map(songId => this.cds.getSongById(songId)));
        }),
        map(songs => songs.filter(defined)),
    );

    const songsPickedByUser$: Observable<Song[]> = combineLatest([allUserCollectionIds$, allSongsInAllUserCollections$])
        .pipe(
            map(([collectionIds, songs]) => songs.filter(s => collectionIds.includes(s.collectionId)))
        );

    const primarySongCollectionMounts$: Observable<(string|undefined)[]> = songsPickedByUser$.pipe(
        flatMap(songs => this.cds.getCollectionsByIds(songs.map(s => s.collectionId))),
        map(collections => collections.map(collection => !!collection ? collection.mount : undefined))
    );
    combineLatest([user$, songsPickedByUser$, primarySongCollectionMounts$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([user, songs, primarySongCollectionMounts]) => {
          this.loaded = true;
          if (!user || !songs || !primarySongCollectionMounts) {
            //TODO: switchToNotFoundMode(this);
            this.cd.detectChanges();
            return;
          }
          this.user = user;
          [this.songs, this.primarySongCollectionMounts] = sortSongsAndMounts(songs, primarySongCollectionMounts);
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
