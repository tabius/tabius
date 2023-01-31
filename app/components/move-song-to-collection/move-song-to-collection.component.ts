import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {UserService} from '@app/services/user.service';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {Collection} from '@common/catalog-model';
import {filter, map, switchMap} from 'rxjs/operators';
import {assertTruthy, isDefined, trackById} from '@common/util/misc-utils';
import {I18N} from '@app/app-i18n';

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

  readonly collections$: Observable<Array<Collection>>;

  selectedCollection?: Collection;

  readonly i18n = I18N.moveSongToCollectionComponent;

  private readonly currentCollectionId$ = new BehaviorSubject<number|undefined>(undefined);
  readonly trackById = trackById;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
  ) {
    this.collections$ = combineLatest([this.uds.getUser$(), this.currentCollectionId$])
        .pipe(
            map(([user,]) => user),
            filter(isDefined),
            switchMap(user => combineLatest([
              this.cds.getUserCollections(user.id),
              user.roles.includes('moderator') ? this.cds.getListedCollections() : of([])
            ])),
            map(([userCollections, listedCollections]) => {
              userCollections.sort((c1, c2) => c1.name.localeCompare(c2.name));
              listedCollections.sort((c1, c2) => c1.name.localeCompare(c2.name));
              return [...userCollections, ...listedCollections].filter(collection => collection.id !== this.currentCollectionId);
            }),
        );

  }

  ngOnInit(): void {
    assertTruthy(this.songId);
    assertTruthy(this.currentCollectionId);
  }

  ngOnChanges(): void {
    assertTruthy(this.songId);
    assertTruthy(this.currentCollectionId);
    this.currentCollectionId$.next(this.currentCollectionId);
  }

  async onMoveButtonClicked(): Promise<void> {
    assertTruthy(this.selectedCollection);
    await this.cds.moveSongToAnotherCollection(this.songId, this.currentCollectionId, this.selectedCollection.id);
    this.moved.emit();
  }
}
