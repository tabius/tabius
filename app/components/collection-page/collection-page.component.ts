import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { CatalogService } from '@app/services/catalog.service';
import { Collection, CollectionDetails, Song } from '@common/catalog-model';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap, throttleTime } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { switchToNotFoundMode } from '@app/utils/component-utils';
import {
  canManageCollectionContent,
  canRemoveCollection,
  getCollectionPageLink,
  getNameFirstFormArtistName,
  getSongPageLink,
  isDefined,
  nothingThen,
  sortSongsAlphabetically,
} from '@common/util/misc-utils';
import { RoutingNavigationHelper } from '@app/services/routing-navigation-helper.service';
import { User } from '@common/user-model';
import { UserService } from '@app/services/user.service';
import { LINK_CATALOG, LINK_STUDIO, PARAM_COLLECTION_MOUNT } from '@common/mounts';
import { SongEditResult } from '@app/components/song-editor/song-editor.component';
import { getCollectionImageUrl } from '@app/utils/url-utils';
import { HelpService } from '@app/services/help.service';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import { I18N } from '@app/app-i18n';
import { ShortcutsService } from '@app/services/shortcuts.service';
import { truthy } from 'assertic';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { buildAffiliateLink, HAS_AFFILIATE_SUPPORT } from '@app/utils/affiliate-utils';
import { isInputEvent } from '@app/utils/misc-utils';

export class CollectionViewModel {
  readonly displayName: string;
  readonly imgSrc: string | undefined;
  readonly songs: Song[];
  readonly primarySongCollections: (Collection | undefined)[];

  constructor(
    readonly collection: Collection,
    readonly bands: Collection[],
    songs: Song[],
    primarySongCollections: (Collection | undefined)[],
    readonly listed: boolean,
  ) {
    this.displayName = getNameFirstFormArtistName(collection);
    this.imgSrc = listed ? getCollectionImageUrl(collection.mount) : undefined;
    [this.songs, this.primarySongCollections] = sortSongsAndRelatedItems(songs, primarySongCollections);
  }
}

@Component({
  templateUrl: './collection-page.component.html',
  styleUrls: ['./collection-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionPageComponent extends ComponentWithLoadingIndicator {
  readonly getCollectionPageLink = getCollectionPageLink;
  readonly i18n = I18N.collectionPage;
  readonly isAffiliateBlockVisible = HAS_AFFILIATE_SUPPORT;
  collectionViewModel?: CollectionViewModel;

  user?: User;
  canAddSongs = false;
  canEditCollection = false;
  songEditorIsOpen = false;
  collectionEditorIsOpen = false;
  private songDetailsPrefetched = false;
  notFound = false;

  hasImageLoadingError = false;

  constructor(
    private readonly cds: CatalogService,
    private readonly uds: UserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly navHelper: RoutingNavigationHelper,
    private readonly helpService: HelpService,
    private readonly ss: ShortcutsService,
  ) {
    super();
    this.helpService.setActiveHelpPage('collection');

    const collectionMount = this.route.snapshot.params[PARAM_COLLECTION_MOUNT];
    const collectionId$: Observable<number | undefined> = this.cds.getCollectionIdByMount(collectionMount);
    const collection$: Observable<Collection | undefined> = collectionId$.pipe(switchMap(id => this.cds.observeCollection(id)));
    const collectionDetails$: Observable<CollectionDetails | undefined> = collectionId$.pipe(
      switchMap(id => this.cds.getCollectionDetails(id)),
    );
    const bands$: Observable<Collection[]> = collectionDetails$.pipe(
      switchMap(details => this.cds.getCollectionsByIds(details ? details.bandIds : [])),
      map(bands => bands.filter(isDefined)),
    );

    const songs$: Observable<Song[]> = collection$.pipe(
      switchMap(collection => this.cds.getSongIdsByCollection(collection && collection.id)),
      switchMap(songIds => this.cds.getSongsByIds(songIds || [])),
      map(songs => songs.filter(isDefined)),
    );
    const primarySongCollections$: Observable<(Collection | undefined)[]> = songs$.pipe(
      switchMap(songs => this.cds.getCollectionsByIds(songs.map(s => s.collectionId))),
    );

    combineLatest([collection$, bands$, songs$, primarySongCollections$, this.uds.getUser$()])
      .pipe(throttleTime(100, undefined, { leading: true, trailing: true }), takeUntilDestroyed())
      .subscribe(([collection, bands, songs, primarySongCollections, user]) => {
        this.cdr.markForCheck();
        this.loaded = true;
        if (!collection || !bands || !songs) {
          if (this.collectionViewModel) {
            this.router.navigate([this.collectionViewModel.listed ? LINK_CATALOG : LINK_STUDIO]).then();
          } else {
            switchToNotFoundMode(this);
          }
          return;
        }
        this.collectionViewModel = new CollectionViewModel(collection, bands, songs, primarySongCollections, !!collection.listed);
        this.user = user;
        this.canAddSongs = canManageCollectionContent(this.user, collection);
        this.canEditCollection = canRemoveCollection(this.user, collection);
        this.updateMeta(songs);
        this.registerStateInCatalogNavigationHistory();
        this.navHelper.restoreScrollPosition();

        // heuristic: prefetch song details.
        if (!this.songDetailsPrefetched && this.isBrowser) {
          this.songDetailsPrefetched = true;
          songs.forEach(s => this.cds.getSongDetailsById(s.id, false));
        }
      });
  }

  updateMeta(songs: Song[]): void {
    const { collectionViewModel } = this;
    if (!collectionViewModel) {
      return;
    }
    const name = collectionViewModel.displayName;
    const { type } = collectionViewModel.collection;
    this.updatePageMetadata({
      title: this.i18n.meta.title(name, type),
      description: this.i18n.meta.description(getFirstSongsNames(songs)),
      keywords: this.i18n.meta.keywords(name),
      image: collectionViewModel.imgSrc,
    });
  }

  openSongEditor(): void {
    this.songEditorIsOpen = true;
    this.collectionEditorIsOpen = false;
  }

  closeSongEditor(editResult: SongEditResult = { type: 'canceled' }): void {
    this.songEditorIsOpen = false;
    this.cdr.markForCheck();
    if (editResult.type === 'created') {
      // go to the newly created song.
      const songMount = truthy(editResult.song).mount;
      const collectionMount = truthy(this.collectionViewModel).collection.mount;
      this.router.navigate([getSongPageLink(collectionMount, songMount)]).then();
    }
  }

  toggleCollectionEditor(): void {
    this.collectionEditorIsOpen = !this.collectionEditorIsOpen;
    if (this.collectionEditorIsOpen && this.songEditorIsOpen) {
      this.songEditorIsOpen = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    if (event.shiftKey && !isInputEvent(event) && event.code === 'KeyA') {
      this.openSongEditor();
      return;
    }
    if (this.ss.isDoubleShiftRightPressEvent && this.collectionViewModel) {
      this.ss.gotoRandomSong(this.collectionViewModel.collection.id);
      return;
    }
  }

  private registerStateInCatalogNavigationHistory(): void {
    if (!this.collectionViewModel) {
      return;
    }
    const name = this.collectionViewModel.collection.name;
    const url = getCollectionPageLink(this.collectionViewModel.collection.mount);
    this.uds.addCatalogNavigationHistoryStep({ name, url }).then(nothingThen);
  }

  readonly buildAffiliateLink = buildAffiliateLink;
}

function getFirstSongsNames(songs: Song[]): string {
  if (songs.length === 0) {
    return '';
  }
  let res = '';
  for (let i = 0, n = Math.min(10, songs.length); i < n; i++) {
    const song = songs[i];
    res += ` ${song.title}.`;
  }
  return res.trim();
}

export function sortSongsAndRelatedItems<T>(songs: Song[], items: T[]): [Song[], T[]] {
  const itemBySong = new Map<number, T>();
  for (let index = 0; index < songs.length; index++) {
    itemBySong.set(songs[index].id, items[index]);
  }
  const sortedSongs = sortSongsAlphabetically(songs);
  const sortedItems = songs.map(s => itemBySong.get(s.id)!);
  return [sortedSongs, sortedItems];
}
