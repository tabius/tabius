import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ToastService} from '@app/toast/toast.service';
import {CatalogService} from '@app/services/catalog.service';
import {I18N} from '@app/app-i18n';

@Component({
  selector: 'gt-user-collection-editor',
  templateUrl: './user-collection-editor.component.html',
  styleUrls: ['./user-collection-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCollectionEditorComponent {

  @Input({required: true}) collectionId!: number;

  /** Emitted when the panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  readonly i18n = I18N.userCollectionEditorComponent;

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
      this.toastService.warning(this.i18n.actionConfirmationPrompt);
      return;
    }
    try {
      await this.cds.deleteUserCollection(this.collectionId);
    } catch (err) {
      this.toastService.warning(this.i18n.failedToRemoveCollection);
      return;
    }
    this.toastService.info(this.i18n.collectionWasRemoved);
    this.close();
  }
}
