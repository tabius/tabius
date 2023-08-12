import {ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {UserService} from '@app/services/user.service';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {User} from '@common/user-model';
import {combineLatest, Observable, of} from 'rxjs';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {CatalogService} from '@app/services/catalog.service';
import {Collection, Song} from '@common/catalog-model';
import {sortSongsAndRelatedItems} from '@app/components/collection-page/collection-page.component';
import {combineLatest0, getSongPageLink, isDefined} from '@common/util/misc-utils';
import {SongEditResult} from '@app/components/song-editor/song-editor.component';
import {Router} from '@angular/router';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {I18N} from '@app/app-i18n';

@Component({
  templateUrl: './studio-page.component.html',
  styleUrls: ['./studio-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudioPageComponent extends ComponentWithLoadingIndicator implements OnInit, OnDestroy {
  readonly i18n = I18N.studioPage;

  user?: User;

  /** Personal pick-ups. */
  songs: Song[] = [];
  primarySongCollections: (Collection|undefined)[] = [];

  editorIsOpen = false;

  private primaryUserCollectionMount: string = '';

  constructor(private readonly uds: UserService,
              private readonly cds: CatalogService,
              private readonly title: Title,
              private readonly meta: Meta,
              private readonly router: Router,
              injector: Injector,
  ) {
    super(injector);
  }


  ngOnInit(): void {
    const user$ = this.uds.getUser$();
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
        map(songs => songs.filter(isDefined)),
    );

    const songsPickedByUser$: Observable<Song[]> = combineLatest([allUserCollectionIds$, allSongsInAllUserCollections$])
        .pipe(
            map(([collectionIds, songs]) => songs.filter(s => collectionIds.includes(s.collectionId)))
        );

    const primarySongCollections$: Observable<(Collection|undefined)[]> = songsPickedByUser$.pipe(
        flatMap(songs => this.cds.getCollectionsByIds(songs.map(s => s.collectionId))),
    );

    const primaryUserCollection$ = user$.pipe(
        flatMap(user => user ? this.cds.getCollectionById(user.collectionId) : of(undefined))
    );

    combineLatest([user$, primaryUserCollection$, songsPickedByUser$, primarySongCollections$])
        .pipe(
            throttleTime(100, undefined, {leading: true, trailing: true}),
            takeUntil(this.destroyed$),
        )
        .subscribe(([user, primaryUserCollection, songs, primarySongCollections]) => {
          this.loaded = true;
          if (!user || !primaryUserCollection || !songs || !primarySongCollections) {
            //TODO: switchToNotFoundMode(this);
            this.cd.detectChanges();
            return;
          }
          this.user = user;
          this.primaryUserCollectionMount = primaryUserCollection.mount;
          [this.songs, this.primarySongCollections] = sortSongsAndRelatedItems(songs, primarySongCollections);
          this.cd.detectChanges();
        });
    this.updateMeta();
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  updateMeta(): void {
    updatePageMetadata(this.title, this.meta, this.i18n.meta);
  }

  openEditor(): void {
    this.editorIsOpen = true;
    this.cd.detectChanges();
  }

  closeEditor(editResult: SongEditResult): void {
    this.editorIsOpen = false;
    this.cd.detectChanges();
    if (editResult.type === 'created') {
      // go to the newly created song.
      const songMount = editResult.song!.mount;
      this.router.navigate([getSongPageLink(this.primaryUserCollectionMount, songMount)]).then();
    }
  }
}
