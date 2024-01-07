import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { combineLatest } from 'rxjs';
import { ToastService } from '@app/toast/toast.service';
import { CreateUserCollectionRequest } from '@common/ajax-model';
import { CatalogService } from '@app/services/catalog.service';
import { map, switchMap } from 'rxjs/operators';
import { combineLatest0, getCollectionPageLink } from '@common/util/misc-utils';
import { I18N } from '@app/app-i18n';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';

interface CollectionInfo {
  id: number;
  linkText: string;
  link: string;
  songCount: number;
  titleText: string;
}

@Component({
  selector: 'gt-user-collections-list',
  templateUrl: './user-collections-list.component.html',
  styleUrls: ['./user-collections-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCollectionsListComponent extends AbstractAppComponent {
  readonly i18n = I18N.userCollectionsListComponent;

  @Input({ required: true }) userId!: string;

  collectionInfos: Array<CollectionInfo> = [];

  newCollectionName = '';

  constructor(private readonly cds: CatalogService, private readonly toastService: ToastService) {
    super();
    this.changes$
      .pipe(
        switchMap(() => {
          const collections$ = this.cds.getUserCollections(this.userId);
          const songCounts$ = collections$.pipe(
            switchMap(collections => combineLatest0(collections.map(c => this.cds.getSongIdsByCollection(c.id)))),
            map(songIds => songIds.map(ids => (!!ids ? ids.length : 0))),
          );
          return combineLatest([collections$, songCounts$]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(([collections, songCounts]) => {
        this.collectionInfos = [];
        for (let i = 0; i < collections.length; i++) {
          const collection = collections[i];
          const songCount = songCounts[i];
          this.collectionInfos.push({
            id: collection.id,
            linkText: collection.name + (songCount > 0 ? ` [${songCount}]` : ''),
            link: getCollectionPageLink(collection),
            songCount,
            titleText: this.i18n.titleText(collection.name, songCount),
          });
        }
        this.cdr.markForCheck();
      });
  }

  createCollection(): void {
    const request: CreateUserCollectionRequest = {
      name: this.newCollectionName,
    };
    this.cds.createUserCollection(this.userId, request).catch(err => this.toastService.warning(err, I18N.common.unexpectedError));
  }
}
