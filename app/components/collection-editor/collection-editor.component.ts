import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {getTranslitLowerCase} from '@common/util/seo-translit';
import {CollectionType} from '@common/catalog-model';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {ToastService} from '@app/toast/toast.service';
import {MOUNT_COLLECTION_PREFIX} from '@common/mounts';
import {Router} from '@angular/router';

@Component({
  selector: 'gt-collection-editor',
  templateUrl: './collection-editor.component.html',
  styleUrls: ['./collection-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionEditorComponent {

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  name = '';

  mount = '';

  collectionType: CollectionType = CollectionType.Person;

  readonly CollectionType = CollectionType;

  constructor(private readonly cds: CatalogDataService,
              private readonly toastService: ToastService,
              private readonly router: Router,
  ) {
  }

  create() {
    this.createImpl().catch(err => {
      console.error(err);
      this.toastService.warning(`Ошибка: ${err}`);
    });
  }

  close() {
    this.closeRequest.emit();
  }

  onNameChanged() {
    this.mount = getTranslitLowerCase(this.name);
  }

  private async createImpl(): Promise<void> {
    //TODO: validate fields!
    //TODO: support Collection image.
    const collection = await this.cds.createCollection({name: this.name, mount: this.mount, type: this.collectionType});
    this.close();
    this.router.navigate([MOUNT_COLLECTION_PREFIX + collection.mount]).catch(err => console.error(err));
  }
}
