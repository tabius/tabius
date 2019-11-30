import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy} from '@angular/core';
import {combineLatest, Subject, Subscription} from 'rxjs';
import {UserDataService} from '@app/services/user-data.service';
import {AuthService} from '@app/services/auth.service';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {ToastService} from '@app/toast/toast.service';
import {combineLatest0, getCollectionPageLink, trackById} from '@common/util/misc-utils';
import {User} from '@common/user-model';
import {CollectionsDataService} from '@app/services/collections-data.service';
import {Collection, Song} from '@common/catalog-model';
import {MSG_UNEXPECTED_ERROR} from '@common/messages';

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

  @Input() song!: Song;

  user?: User;
  collections: ComponentCollectionData[] = [];
  showRegistrationPrompt = false;

  readonly trackById = trackById;

  private songSubscription?: Subscription;
  private readonly destroyed$ = new Subject();

  constructor(
      private readonly uds: UserDataService,
      private readonly cds: CollectionsDataService,
      private readonly authService: AuthService,
      private readonly cd: ChangeDetectorRef,
      private readonly toastService: ToastService,
  ) {
  }

  ngOnChanges() {
    this.resetComponentState();
    const user$ = this.uds.getUser();
    const collections$ = user$.pipe(flatMap(user => !!user ? this.cds.getUserCollections(user.id) : []));
    const isSongInCollection$ = collections$.pipe(
        flatMap(collections => combineLatest0(collections.map(c => this.cds.getSongIdsByCollection(c.id)))),
        map((songIdsPerCollection: (number[]|undefined)[]) =>
            songIdsPerCollection.map(songIds => !!songIds && songIds.includes(this.song.id))),
    );

    this.songSubscription = combineLatest([user$, collections$, isSongInCollection$]).pipe(takeUntil(this.destroyed$))
        .subscribe(([user, collections, isSongInCollection]) => {
          this.user = user;
          this.collections = collections
              .map((collection, index) => ({
                ...collection,
                isSongInCollection: isSongInCollection[index],
                // today we have only 1 collection,
                name: collection.name,
                routerLink: getCollectionPageLink(collection),
              }))
              .filter(c => c.id !== this.song.collectionId); // do not show primary collection in the list

          this.cd.detectChanges();
        });
  }

  private resetComponentState(): void {
    if (this.songSubscription) {
      this.songSubscription.unsubscribe();
      this.songSubscription = undefined;
    }
    this.user = undefined;
    this.collections = [];
    this.showRegistrationPrompt = false;
  }

  ngOnDestroy() {
    this.destroyed$.next();
  }

  async toggleCollection(collection: ComponentCollectionData, checkboxElement: any = {}) {
    try {
      if (collection.isSongInCollection) {
        await this.cds.removeSongFromSecondaryCollection(this.song.id, collection.id);
      } else {
        await this.cds.addSongToSecondaryCollection(this.song.id, collection.id);
      }
    } catch (err) {
      console.error(err);
      this.toastService.warning(err, MSG_UNEXPECTED_ERROR);
      //todo: this code unsafe, checkbox may not exist!
      const updatedCollection = this.collections.find(c => c.id == collection.id);
      checkboxElement.checked = updatedCollection && updatedCollection.isSongInCollection;
    }
  }

  toggleRegistrationPrompt(checkboxElement: any = {}) {
    this.showRegistrationPrompt = !this.showRegistrationPrompt;
    checkboxElement.checked = false;
  }
}
