import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy} from '@angular/core';
import {combineLatest, Observable, Subject, Subscription, switchMap} from 'rxjs';
import {UserService} from '@app/services/user.service';
import {map, takeUntil} from 'rxjs/operators';
import {ToastService} from '@app/toast/toast.service';
import {combineLatest0, getCollectionPageLink, isModerator, trackById} from '@common/util/misc-utils';
import {User} from '@common/user-model';
import {CatalogService} from '@app/services/catalog.service';
import {Collection, Song, SongDetails} from '@common/catalog-model';
import {I18N} from '@app/app-i18n';

interface ComponentCollectionData extends Collection {
  isSongInCollection: boolean;
  routerLink: string;
}

@Component({
  selector: 'gt-add-song-to-collection',
  templateUrl: './add-song-to-collection.component.html',
  styleUrls: ['./add-song-to-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddSongToCollectionComponent implements OnChanges, OnDestroy {

  @Input({required: true}) songId!: number;

  user?: User;
  song?: Song;
  songDetails?: SongDetails;
  collections: ComponentCollectionData[] = [];
  showRegistrationPrompt = false;

  readonly trackById = trackById;
  readonly isModerator = isModerator;
  readonly i18n = I18N.addSongToCollection;

  private songSubscription?: Subscription;
  private readonly destroyed$ = new Subject();

  constructor(
      private readonly userService: UserService,
      private readonly catalogService: CatalogService,
      private readonly cdr: ChangeDetectorRef,
      private readonly toastService: ToastService,
  ) {
  }

  ngOnChanges(): void {
    this.resetComponentState();
    const user$ = this.userService.getUser$();
    const collections$ = user$.pipe(switchMap(user => user ? this.catalogService.getUserCollections(user.id) : []));
    const isSongInCollection$: Observable<boolean[]> = collections$.pipe(
        switchMap(collections => combineLatest0(collections.map(c => this.catalogService.getSongIdsByCollection(c.id)))),
        map((songIdsPerCollection: (number[]|undefined)[]) =>
            songIdsPerCollection.map(songIds => !!songIds && songIds.includes(this.songId))),
    );
    const song$ = this.catalogService.getSongById(this.songId);
    const songDetails$ = this.catalogService.getSongDetailsById(this.songId);

    this.songSubscription = combineLatest([user$, collections$, isSongInCollection$, song$, songDetails$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([user, collections, isSongInCollection, song, songDetails]) => {
          this.user = user;
          this.song = song;
          this.songDetails = songDetails;
          this.collections = collections.map((collection, index) => ({
            ...collection,
            isSongInCollection: isSongInCollection[index],
            // Today we have only one collection.
            name: collection.name,
            routerLink: getCollectionPageLink(collection),
          })).filter(c => c.id !== song?.collectionId); // Do not show a primary collection in the list.

          this.cdr.detectChanges();
        });
  }

  private resetComponentState(): void {
    if (this.songSubscription) {
      this.songSubscription.unsubscribe();
      this.songSubscription = undefined;
    }
    this.user = undefined;
    this.song = undefined;
    this.songDetails = undefined;
    this.collections = [];
    this.showRegistrationPrompt = false;
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  async toggleCollection(collection: ComponentCollectionData, checkboxElement: EventTarget): Promise<void> {
    try {
      if (collection.isSongInCollection) {
        await this.catalogService.removeSongFromSecondaryCollection(this.songId, collection.id);
      } else {
        await this.catalogService.addSongToSecondaryCollection(this.songId, collection.id);
      }
    } catch (err) {
      console.error(err);
      this.toastService.warning(err, I18N.common.unexpectedError);
      const updatedCollection = this.collections.find(c => c.id == collection.id);
      (checkboxElement as HTMLInputElement).checked = !!updatedCollection && updatedCollection.isSongInCollection;
    }
  }

  toggleRegistrationPrompt(checkboxElement: EventTarget): void {
    this.showRegistrationPrompt = !this.showRegistrationPrompt;
    (checkboxElement as HTMLInputElement).checked = false;
  }

  async toggleSceneFlag(checkboxElement: EventTarget): Promise<void> {
    const checkbox = checkboxElement as HTMLInputElement;
    try {
      await this.catalogService.toggleSongSceneFlag(this.songId, checkbox.checked);
      this.toastService.info(checkbox.checked ? this.i18n.sceneFlagOnMessage : this.i18n.sceneFlagOffMessage);
    } catch (err: unknown) {
      console.error(err);
      this.toastService.warning(err, I18N.common.unexpectedError);
      checkbox.checked = !!this.songDetails?.scene;
    }
  }
}
