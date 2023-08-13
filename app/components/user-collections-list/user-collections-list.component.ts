import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy} from '@angular/core';
import {combineLatest, Observable, Subject, Subscription} from 'rxjs';
import {ToastService} from '@app/toast/toast.service';
import {CreateUserCollectionRequest} from '@common/ajax-model';
import {CatalogService} from '@app/services/catalog.service';
import {map, switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest0, getCollectionPageLink} from '@common/util/misc-utils';
import {I18N} from '@app/app-i18n';

interface CollectionInfo {
  linkText: string;
  link: string;
  songCount: number;
  titleText: string;
}

@Component({
  selector: 'gt-user-collections-list',
  templateUrl: './user-collections-list.component.html',
  styleUrls: ['./user-collections-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCollectionsListComponent implements OnChanges, OnDestroy {

  readonly i18n = I18N.userCollectionsListComponent;

  private readonly destroyed$ = new Subject();

  @Input({required: true}) userId!: string;

  collectionInfos: CollectionInfo[] = [];

  newCollectionName = '';

  private userIdSubscription?: Subscription;

  constructor(private readonly cds: CatalogService,
              private readonly toastService: ToastService,
              private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnChanges(): void {
    if (this.userIdSubscription) {
      this.userIdSubscription.unsubscribe();
      this.collectionInfos = [];
    }

    const collections$ = this.cds.getUserCollections(this.userId);
    const songCounts$: Observable<number[]> = collections$.pipe(
        switchMap(collections => combineLatest0(collections.map(c => this.cds.getSongIdsByCollection(c.id)))),
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
              linkText: collection.name + (songCount > 0 ? ` [${songCount}]` : ''),
              link: getCollectionPageLink(collection),
              songCount,
              titleText: this.i18n.titleText(collection.name, songCount),
            });
          }
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  createCollection(): void {
    const request: CreateUserCollectionRequest = {
      name: this.newCollectionName,
    };
    this.cds.createUserCollection(this.userId, request)
        .catch(err => this.toastService.warning(err, I18N.common.unexpectedError));
  }
}
