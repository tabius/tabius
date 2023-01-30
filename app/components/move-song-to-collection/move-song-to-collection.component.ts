import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {UserService} from '@app/services/user.service';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {Collection} from '@common/catalog-model';
import {map, switchMap} from 'rxjs/operators';
import {assertTruthy, trackById} from '@common/util/misc-utils';
import {ToastService} from '@app/toast/toast.service';

@Component({
  selector: 'gt-move-song-to-collection',
  templateUrl: './move-song-to-collection.component.html',
  styleUrls: ['./move-song-to-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoveSongToCollectionComponent implements OnInit, OnChanges {

  @Input() songId!: number;
  @Input() currentCollectionId!: number;

  /** Emitted song is deleted. */
  @Output() moved = new EventEmitter<void>();

  readonly userCollections$: Observable<Array<Collection>>;

  selectedCollection?: Collection;

  private readonly collectionIdToExclude$ = new BehaviorSubject<number|undefined>(undefined);
  readonly trackById = trackById;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              private readonly toast: ToastService,
  ) {
    this.userCollections$ = combineLatest([this.uds.getUser$(), this.collectionIdToExclude$])
        .pipe(
            switchMap(([user,]) => this.cds.getUserCollections(user?.id)),
            map(collections => collections.filter(collection => collection.id !== this.currentCollectionId)),
        );

  }

  ngOnInit(): void {
    assertTruthy(this.songId);
    assertTruthy(this.currentCollectionId);
  }

  ngOnChanges(): void {
    assertTruthy(this.songId);
    assertTruthy(this.currentCollectionId);
    this.collectionIdToExclude$.next(this.currentCollectionId);
  }

  async onMoveButtonClicked(): Promise<void> {
    assertTruthy(this.selectedCollection);
    await this.cds.moveSongToAnotherCollection(this.songId, this.currentCollectionId, this.selectedCollection.id);
    this.moved.emit();
  }
}
