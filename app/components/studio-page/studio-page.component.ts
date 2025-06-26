import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UserService } from '@app/services/user.service';
import { User } from '@common/user-model';
import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap, throttleTime } from 'rxjs/operators';
import { CatalogService } from '@app/services/catalog.service';
import { Collection, Song } from '@common/catalog-model';
import { sortSongsAndRelatedItems } from '@app/components/collection-page/collection-page.component';
import { combineLatest0, getSongPageLink, isDefined } from '@common/util/misc-utils';
import { SongEditResult } from '@app/components/song-editor/song-editor.component';
import { Router } from '@angular/router';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import { I18N } from '@app/app-i18n';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { assertTruthy } from 'assertic';

@Component({
    templateUrl: './studio-page.component.html',
    styleUrls: ['./studio-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class StudioPageComponent extends ComponentWithLoadingIndicator {
  private readonly uds = inject(UserService);
  private readonly cds = inject(CatalogService);
  private readonly router = inject(Router);

  readonly i18n = I18N.studioPage;

  user?: User;

  /** Personal pick-ups. */
  songs: Song[] = [];
  primarySongCollections: (Collection | undefined)[] = [];

  editorIsOpen = false;

  private primaryUserCollectionMount: string = '';

  constructor() {
    super();
    const user$ = this.uds.getUser$();
    const allUserCollectionIds$ = user$.pipe(switchMap(user => this.cds.getUserCollectionIds(user && user.id)));
    const allSongsInAllUserCollections$: Observable<Song[]> = allUserCollectionIds$.pipe(
      switchMap((collectionIds: number[] | undefined) =>
        combineLatest0((collectionIds || []).map(id => this.cds.getSongIdsByCollection(id))),
      ),
      switchMap((songIdsArray: (number[] | undefined)[]) => {
        const uniqueSongIds = new Set<number>();
        for (const collectionSongIds of songIdsArray || []) {
          for (const songId of collectionSongIds || []) {
            uniqueSongIds.add(songId);
          }
        }
        return combineLatest0([...uniqueSongIds].map(songId => this.cds.observeSong(songId)));
      }),
      map(songs => songs.filter(isDefined)),
    );

    const songsPickedByUser$: Observable<Song[]> = combineLatest([allUserCollectionIds$, allSongsInAllUserCollections$]).pipe(
      map(([collectionIds, songs]) => songs.filter(s => collectionIds.includes(s.collectionId))),
    );

    const primarySongCollections$: Observable<(Collection | undefined)[]> = songsPickedByUser$.pipe(
      switchMap(songs => this.cds.getCollectionsByIds(songs.map(s => s.collectionId))),
    );

    const primaryUserCollection$ = user$.pipe(
      switchMap(user => (user ? this.cds.observeCollection(user.collectionId) : of(undefined))),
    );

    combineLatest([user$, primaryUserCollection$, songsPickedByUser$, primarySongCollections$])
      .pipe(throttleTime(100, undefined, { leading: true, trailing: true }), takeUntilDestroyed())
      .subscribe(([user, primaryUserCollection, songs, primarySongCollections]) => {
        this.cdr.markForCheck();
        this.loaded = true;
        if (!user || !primaryUserCollection || !songs || !primarySongCollections) {
          //TODO: switchToNotFoundMode(this);
          return;
        }
        this.user = user;
        this.primaryUserCollectionMount = primaryUserCollection.mount;
        [this.songs, this.primarySongCollections] = sortSongsAndRelatedItems(songs, primarySongCollections);
      });
    this.updatePageMetadata(this.i18n.meta);
  }

  openEditor(): void {
    this.editorIsOpen = true;
  }

  closeEditor(editResult: SongEditResult): void {
    this.editorIsOpen = false;
    this.cdr.markForCheck();
    if (editResult.type === 'created') {
      // go to the newly created song.
      assertTruthy(editResult.song, 'Song must be defined');
      const songMount = editResult.song.mount;
      this.router.navigate([getSongPageLink(this.primaryUserCollectionMount, songMount)]).then();
    }
  }
}
