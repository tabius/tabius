import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ToastService} from '@app/toast/toast.service';
import {CatalogService} from '@app/services/catalog.service';

@Component({
  selector: 'gt-user-collection-editor',
  templateUrl: './user-collection-editor.component.html',
  styleUrls: ['./user-collection-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCollectionEditorComponent {

  @Input() collectionId!: number;

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  deleteConfirmationFlag = false;

  constructor(private readonly toastService: ToastService,
              private readonly cds: CatalogService,
  ) {
  }

  close(): void {
    this.closeRequest.emit();
  }

  toggleDeleteConfirmationFlag($event): void {
    this.deleteConfirmationFlag = $event.target.checked;
  }

  async delete(): Promise<void> {
    if (!this.deleteConfirmationFlag) {
      this.toastService.warning('Необходимо подтвердить действие!');
      return;
    }
    try {
      await this.cds.deleteUserCollection(this.collectionId);
    } catch (err) {
      this.toastService.warning('Ошибка при удалении коллекции!');
      return;
    }
    this.toastService.info('Коллекция удалена.');
    this.close();
  }
}
