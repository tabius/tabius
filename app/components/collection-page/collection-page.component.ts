import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {CollectionsDataService} from '@app/services/collections-data.service';
import {Collection, CollectionDetails, isBand, isCompilation, Song} from '@common/catalog-model';
import {ActivatedRoute} from '@angular/router';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import {enableLoadingIndicator, switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {canEditCollection, defined, getCollectionImageUrl, getCollectionPageLink, getNameFirstFormArtistName, sortSongsAlphabetically} from '@common/util/misc-utils';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {User} from '@common/user-model';
import {UserDataService} from '@app/services/user-data.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {PARAM_COLLECTION_MOUNT} from '@common/mounts';

export class CollectionViewModel {
  readonly displayName: string;
  readonly imgSrc: string|undefined;
  readonly songs: Song[];
  readonly primarySongCollectionMounts: (string|undefined)[];

  constructor(readonly collection: Collection,
              readonly bands: Collection[],
              songs: Song[],
              primarySongCollectionMounts: (string|undefined)[],
              readonly listed: boolean) {
    this.displayName = getNameFirstFormArtistName(collection);
    this.imgSrc = listed ? getCollectionImageUrl(collection.mount) : undefined;
    const primaryCollectionMountBySong = new Map<number, string|undefined>();
    for (let index = 0; index < songs.length; index++) {
      primaryCollectionMountBySong.set(songs[index].id, primarySongCollectionMounts[index]);
    }
    this.songs = sortSongsAlphabetically(songs);
    this.primarySongCollectionMounts = this.songs.map((s) => primaryCollectionMountBySong.get(s.id));
  }
}

@Component({
  selector: 'gt-collection-page',
  templateUrl: './collection-page.component.html',
  styleUrls: ['./collection-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);
  readonly getCollectionPageLink = getCollectionPageLink;

  collectionViewModel?: CollectionViewModel;

  user?: User;
  canAddSongs = false;
  editorIsOpen = false;
  private songDetailsPrefetched = false;
  loaded = false;
  notFound = false;

  hasImageLoadingError = false;

  constructor(private readonly cds: CollectionsDataService,
              private readonly uds: UserDataService,
              private readonly bss: BrowserStateService,
              readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              readonly title: Title,
              readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

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
    const primarySongCollectionMounts$: Observable<(string|undefined)[]> = songs$.pipe(
        flatMap(songs => this.cds.getCollectionsByIds(songs.map(s => s.collectionId))),
        map(collections => collections.map(collection => !!collection ? collection.mount : undefined))
    );

    combineLatest([collection$, collectionDetails$, bands$, songs$, primarySongCollectionMounts$, this.uds.getUser()])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([collection, collectionDetails, bands, songs, primarySongCollectionMounts, user]) => {
          this.loaded = true;
          if (!collection || !collectionDetails || !bands || !songs) {
            switchToNotFoundMode(this);
            return;
          }
          this.collectionViewModel = new CollectionViewModel(collection, bands, songs, primarySongCollectionMounts, collectionDetails.listed);
          this.user = user;
          this.canAddSongs = canEditCollection(this.user, collection);
          this.updateMeta(songs);
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();

          // heuristic: prefetch song details.
          if (!this.songDetailsPrefetched && this.bss.isBrowser) {
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
    const typeInfo = isCompilation(type) ? ', сборник ' : (isBand(type) ? ', группа' : '');
    updatePageMetadata(this.title, this.meta, {
      title: `${name}${typeInfo} — тексты песен и аккорды для гитары`,
      description: `${name} — полная коллекция всех песен и аккордов для гитары.${getFirstSongsNames(songs)}`,
      keywords: [`${name} аккорды`, `табы ${name}`, `подбор ${name}`, `тексты ${name}`, `песни ${name}`],
      image: collectionViewModel.imgSrc,
    });
  }

  toggleEditor(): void {
    this.editorIsOpen = !this.editorIsOpen;
    this.cd.detectChanges();
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
  return res;
}

