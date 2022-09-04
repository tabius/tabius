import {ChangeDetectionStrategy, Component, HostListener, Injector, OnDestroy, OnInit} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {Collection, CollectionDetails, Song} from '@common/catalog-model';
import {ActivatedRoute, Router} from '@angular/router';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {combineLatest, Observable} from 'rxjs';
import {switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {canManageCollectionContent, canRemoveCollection, defined, getCollectionPageLink, getNameFirstFormArtistName, getSongPageLink, isInputEvent, nothingThen, sortSongsAlphabetically} from '@common/util/misc-utils';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {User} from '@common/user-model';
import {UserService} from '@app/services/user.service';
import {LINK_CATALOG, LINK_STUDIO, PARAM_COLLECTION_MOUNT} from '@common/mounts';
import {SongEditResult} from '@app/components/song-editor/song-editor.component';
import {getCollectionImageUrl} from '@app/utils/url-utils';
import {HelpService} from '@app/services/help.service';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {I18N} from '@app/app-i18n';
import {ShortcutsService} from '@app/services/shortcuts.service';

export class CollectionViewModel {
  readonly displayName: string;
  readonly imgSrc: string|undefined;
  readonly songs: Song[];
  readonly primarySongCollections: (Collection|undefined)[];

  constructor(readonly collection: Collection,
              readonly bands: Collection[],
              songs: Song[],
              primarySongCollections: (Collection|undefined)[],
              readonly listed: boolean) {
    this.displayName = getNameFirstFormArtistName(collection);
    this.imgSrc = listed ? getCollectionImageUrl(collection.mount) : undefined;
    [this.songs, this.primarySongCollections] = sortSongsAndRelatedItems(songs, primarySongCollections);
  }
}

@Component({
  templateUrl: './collection-page.component.html',
  styleUrls: ['./collection-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionPageComponent extends ComponentWithLoadingIndicator implements OnInit, OnDestroy {
  readonly getCollectionPageLink = getCollectionPageLink;
  readonly i18n = I18N.collectionPage;

  collectionViewModel?: CollectionViewModel;

  user?: User;
  canAddSongs = false;
  canEditCollection = false;
  songEditorIsOpen = false;
  collectionEditorIsOpen = false;
  private songDetailsPrefetched = false;
  notFound = false;

  hasImageLoadingError = false;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              private readonly route: ActivatedRoute,
              readonly title: Title,
              readonly meta: Meta,
              private readonly router: Router,
              private readonly navHelper: RoutingNavigationHelper,
              private readonly helpService: HelpService,
              private readonly ss: ShortcutsService,
              injector: Injector
  ) {
    super(injector);
  }

  ngOnInit() {
    this.helpService.setActiveHelpPage('collection');

    const collectionMount = this.route.snapshot.params[PARAM_COLLECTION_MOUNT];
    const collectionId$: Observable<number|undefined> = this.cds.getCollectionIdByMount(collectionMount);
    const collection$: Observable<Collection|undefined> = collectionId$.pipe(flatMap(id => this.cds.getCollectionById(id)));
    const collectionDetails$: Observable<CollectionDetails|undefined> = collectionId$.pipe(flatMap(id => this.cds.getCollectionDetails(id)));
    const bands$: Observable<Collection[]> = collectionDetails$.pipe(
        flatMap(details => this.cds.getCollectionsByIds(details ? details.bandIds : [])),
        map(bands => bands.filter(defined))
    );

    const songs$: Observable<Song[]> = collection$.pipe(
        flatMap(collection => this.cds.getSongIdsByCollection(collection && collection.id)),
        flatMap(songIds => this.cds.getSongsByIds(songIds || [])),
        map(songs => songs.filter(defined))
    );
    const primarySongCollections$: Observable<(Collection|undefined)[]> = songs$.pipe(
        flatMap(songs => this.cds.getCollectionsByIds(songs.map(s => s.collectionId))),
    );

    combineLatest([collection$, collectionDetails$, bands$, songs$, primarySongCollections$, this.uds.getUser()])
        .pipe(
            throttleTime(100, undefined, {leading: true, trailing: true}),
            takeUntil(this.destroyed$),
        )
        .subscribe(([collection, collectionDetails, bands, songs, primarySongCollections, user]) => {
          this.loaded = true;
          if (!collection || !collectionDetails || !bands || !songs) {
            if (this.collectionViewModel) {
              this.router.navigate([this.collectionViewModel.listed ? LINK_CATALOG : LINK_STUDIO]);
            } else {
              switchToNotFoundMode(this);
            }
            return;
          }
          this.collectionViewModel = new CollectionViewModel(collection, bands, songs, primarySongCollections, collectionDetails.listed);
          this.user = user;
          this.canAddSongs = canManageCollectionContent(this.user, collection);
          this.canEditCollection = canRemoveCollection(this.user, collection);
          this.updateMeta(songs);
          this.registerStateInCatalogNavigationHistory();
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();

          // heuristic: prefetch song details.
          if (!this.songDetailsPrefetched && this.isBrowser) {
            this.songDetailsPrefetched = true;
            songs.forEach(s => this.cds.getSongDetailsById(s.id, false));
          }
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta(songs: Song[]): void {
    const {collectionViewModel} = this;
    if (!collectionViewModel) {
      return;
    }
    const name = collectionViewModel.displayName;
    const {type} = collectionViewModel.collection;
    updatePageMetadata(this.title, this.meta, {
      title: this.i18n.meta.title(name, type),
      description: this.i18n.meta.description(getFirstSongsNames(songs)),
      keywords: this.i18n.meta.keywords(name),
      image: collectionViewModel.imgSrc,
    });
  }

  openSongEditor(): void {
    this.songEditorIsOpen = true;
    this.collectionEditorIsOpen = false;
    this.cd.detectChanges();
  }

  closeSongEditor(editResult: SongEditResult = {type: 'canceled'}): void {
    this.songEditorIsOpen = false;
    this.cd.detectChanges();
    if (editResult.type === 'created') {
      // go to the newly created song.
      const songMount = editResult.song!.mount;
      const collectionMount = this.collectionViewModel!.collection.mount;
      this.router.navigate([getSongPageLink(collectionMount, songMount)]);
    }
  }

  toggleCollectionEditor(): void {
    this.collectionEditorIsOpen = !this.collectionEditorIsOpen;
    if (this.collectionEditorIsOpen && this.songEditorIsOpen) {
      this.songEditorIsOpen = false;
    }
    this.cd.detectChanges();
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
    this.uds.addCatalogNavigationHistoryStep({name, url}).then(nothingThen);
  }
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

export function sortSongsAndRelatedItems<T>(songs: Song[], items: T[]): ([Song[], T[]]) {
  const itemBySong = new Map<number, T>();
  for (let index = 0; index < songs.length; index++) {
    itemBySong.set(songs[index].id, items[index]);
  }
  const sortedSongs = sortSongsAlphabetically(songs);
  const sortedItems = songs.map(s => itemBySong.get(s.id)!);
  return [sortedSongs, sortedItems];
}

