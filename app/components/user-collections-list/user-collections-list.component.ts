import {ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {combineLatest, Observable, Subject, Subscription} from 'rxjs';
import {ToastService} from '@app/toast/toast.service';
import {CreateCollectionRequest} from '@common/ajax-model';
import {CollectionType} from '@common/catalog-model';
import {MSG_UNEXPECTED_ERROR} from '@common/messages';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {UserDataService} from '@app/services/user-data.service';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {combineLatest0, getCollectionPageLink} from '@common/util/misc-utils';


interface CollectionInfo {
  name: string;
  link: string;
  songCount: number;
}

@Component({
  selector: 'gt-user-collections-list',
  templateUrl: './user-collections-list.component.html',
  styleUrls: ['./user-collections-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCollectionsListComponent implements OnChanges, OnDestroy {

  private readonly destroyed$ = new Subject();

  @Input() userId!: string;

  collectionInfos: CollectionInfo[] = [];

  newCollectionName = '';

  private userIdSubscription?: Subscription;

  constructor(private readonly cds: CatalogDataService,
              private readonly uds: UserDataService,
              private readonly toastService: ToastService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.userIdSubscription) {
      this.userIdSubscription.unsubscribe();
      this.collectionInfos = [];
    }

    const collections$ = this.cds.getUserCollections(this.userId);
    const songCounts$: Observable<number[]> = collections$.pipe(
        flatMap(collections => combineLatest0(collections.map(c => this.cds.getSongIdsByCollection(c.id)))),
        map((songIds: (number[]|undefined)[]) => songIds.map(ids => !!ids ? ids.length : 0))
    );

    this.userIdSubscription = combineLatest([collections$, songCounts$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([collections, songCounts]) => {
          this.collectionInfos = [];
          for (let i = 0; i < collections.length; i++) {
            const collection = collections[i];
            const songCount = songCounts[i];
            this.collectionInfos.push({
              name: collection.name,
              link: getCollectionPageLink(collection.mount),
              songCount,
            });
          }
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  createCollection(): void {
    const mount = ''; //TODO
    const request: CreateCollectionRequest = {name: this.newCollectionName, mount, type: CollectionType.Compilation};
    this.cds.createCollection(request)
        .catch(err => this.toastService.warning(err, MSG_UNEXPECTED_ERROR));
  }

}
