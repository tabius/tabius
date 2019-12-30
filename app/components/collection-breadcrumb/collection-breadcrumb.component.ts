import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Collection} from '@common/catalog-model';
import {LINK_CATALOG, LINK_STUDIO} from '@common/mounts';
import {getCollectionPageLink, isValidUserId} from '@common/util/misc-utils';
import {I18N} from '@app/app-i18n';

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

  readonly i18n = I18N.collectionBreadcrumb;

  showCatalogLink = false;

  showStudioLink = false;

  collectionPageLink = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (this.collection) {
      this.showStudioLink = isValidUserId(this.collection.userId);
      this.showCatalogLink = !this.showStudioLink;
      this.collectionPageLink = getCollectionPageLink(this.collection);
    } else {
      this.showStudioLink = false;
      this.showCatalogLink = true;
      this.collectionPageLink = '';
    }
  }

}
