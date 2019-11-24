import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {combineLatest, Subject} from 'rxjs';
import {UserDataService} from '@app/services/user-data.service';
import {AuthService} from '@app/services/auth.service';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {ToastService} from '@app/toast/toast.service';
import {combineLatest0, trackById} from '@common/util/misc-utils';
import {User} from '@common/user-model';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {Collection} from '@common/catalog-model';
import {MSG_UNEXPECTED_ERROR} from '@common/messages';
import {LINK_USER_STUDIO} from '@common/mounts';

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
export class AddSongToCollectionComponent implements OnInit, OnDestroy {

  @Input() songId!: number;

  user?: User;
  collections: ComponentCollectionData[] = [];
  showRegistrationPrompt = false;

  readonly trackById = trackById;

  private readonly destroyed$ = new Subject();

  constructor(
      private readonly uds: UserDataService,
      private readonly cds: CatalogDataService,
      private readonly authService: AuthService,
      private readonly cd: ChangeDetectorRef,
      private readonly toastService: ToastService,
  ) {
  }

  ngOnInit() {
    const user$ = this.uds.getUser();
    const collections$ = user$.pipe(flatMap(user => this.cds.getUserCollections(user)));
    const isSongInCollection$ = collections$.pipe(
        flatMap(collections => combineLatest0(collections.map(c => this.cds.getCollectionSongList(c.id)))),
        map((songIdsPerCollection: (number[]|undefined)[]) =>
            songIdsPerCollection.map(songIds => !!songIds && songIds.includes(this.songId))),
    );

    combineLatest([user$, collections$, isSongInCollection$]).pipe(takeUntil(this.destroyed$))
        .subscribe(([user, collections, isSongInCollection]) => {
          this.user = user;
          this.collections = collections.map((collection, index) => ({
            ...collection,
            isSongInCollection: isSongInCollection[index],
            // today we have only 1 collection,
            name: 'Избранное',
            routerLink: LINK_USER_STUDIO,
          }));
          this.cd.detectChanges();
        });
  }

  ngOnDestroy() {
    this.destroyed$.next();
  }

  async toggleCollection(collection: ComponentCollectionData, checkboxElement: any = {}) {
    try {
      if (collection.isSongInCollection) {
        await this.cds.removeSongFromSecondaryCollection(this.songId, collection.id);
      } else {
        await this.cds.addSongToSecondaryCollection(this.songId, collection.id);
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
    if (this.showRegistrationPrompt) {
      this.toastService.warning('Зарегистрируйтесь или войдите, чтобы добавлять свои песни.');
    }
  }
}
