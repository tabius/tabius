import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CatalogService } from '@app/services/catalog.service';
import { UserService } from '@app/services/user.service';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { Collection } from '@common/catalog-model';
import { filter, map, switchMap } from 'rxjs/operators';
import { isDefined, trackById } from '@common/util/misc-utils';
import { I18N } from '@app/app-i18n';
import { ToastService } from '@app/toast/toast.service';
import { assertTruthy } from 'assertic';

@Component({
  selector: 'gt-move-song-to-collection',
  templateUrl: './move-song-to-collection.component.html',
  styleUrls: ['./move-song-to-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveSongToCollectionComponent implements OnChanges {
  @Input() mode: 'add' | 'move' = 'move';

  @Input({ required: true }) songId!: number;
  @Input({ required: true }) currentCollectionId!: number;

  /** Emitted song is deleted. */
  @Output() moved = new EventEmitter<void>();

  readonly collections$: Observable<Array<Collection>>;

  selectedCollection?: Collection;

  readonly i18n = I18N.moveSongToCollectionComponent;

  private readonly currentCollectionId$ = new BehaviorSubject<number | undefined>(undefined);
  readonly trackById = trackById;

  constructor(private readonly cds: CatalogService, private readonly uds: UserService, private readonly toastService: ToastService) {
    this.collections$ = combineLatest([this.uds.getUser$(), this.currentCollectionId$]).pipe(
      map(([user]) => user),
      filter(isDefined),
      switchMap(user =>
        combineLatest([
          this.cds.getUserCollections(user.id),
          user.roles.includes('moderator') ? this.cds.getListedCollections() : of([]),
        ]),
      ),
      map(([userCollections, listedCollections]) => {
        userCollections.sort((c1, c2) => c1.name.localeCompare(c2.name));
        listedCollections.sort((c1, c2) => c1.name.localeCompare(c2.name));
        return [...userCollections, ...listedCollections].filter(collection => collection.id !== this.currentCollectionId);
      }),
    );
  }

  ngOnChanges(): void {
    this.currentCollectionId$.next(this.currentCollectionId);
  }

  async onMoveButtonClicked(): Promise<void> {
    assertTruthy(this.selectedCollection);
    if (this.mode === 'move') {
      await this.cds.moveSongToAnotherCollection(this.songId, this.currentCollectionId, this.selectedCollection.id);
      this.moved.emit();
    } else {
      await this.cds.addSongToSecondaryCollection(this.songId, this.selectedCollection.id);
      this.toastService.show(this.i18n.songIsAddedToCollection + this.selectedCollection.name, 'info');
    }
  }
}
