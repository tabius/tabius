import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Collection} from '@common/catalog-model';
import {LINK_CATALOG, LINK_STUDIO} from '@common/mounts';
import {getCollectionPageLink, isValidUserId} from '@common/util/misc-utils';

@Component({
  selector: 'gt-collection-breadcrumb',
  templateUrl: './collection-breadcrumb.component.html',
  styleUrls: ['./collection-breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionBreadcrumbComponent implements OnChanges {

  @Input() collection?: Collection;

  @Input() showCollectionLink = true;

  readonly catalogLink = LINK_CATALOG;

  readonly studioLink = LINK_STUDIO;

  showCatalogLink = false;

  showStudioLink = false;

  collectionPageLink = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (this.collection) {
      this.showStudioLink = isValidUserId(this.collection.userId);
      this.showCatalogLink = !isValidUserId(this.collection.userId);
      this.collectionPageLink = getCollectionPageLink(this.collection);
    } else {
      this.showStudioLink = false;
      this.showCatalogLink = true;
      this.collectionPageLink = '';
    }
  }


}
