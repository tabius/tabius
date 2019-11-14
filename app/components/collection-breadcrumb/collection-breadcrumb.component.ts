import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Collection} from '@common/catalog-model';
import {MOUNT_CATALOG} from '@common/mounts';
import {getCollectionPageLink} from '@common/util/misc-utils';

@Component({
  selector: 'gt-collection-breadcrumb',
  templateUrl: './collection-breadcrumb.component.html',
  styleUrls: ['./collection-breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionBreadcrumbComponent {

  @Input() collection?: Collection;
  @Input() showCollectionLink = true;

  readonly getCollectionPageLink = getCollectionPageLink;

  readonly catalogLink = `/${MOUNT_CATALOG}`;
}
