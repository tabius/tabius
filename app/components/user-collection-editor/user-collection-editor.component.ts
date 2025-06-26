import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ToastService } from '@app/toast/toast.service';
import { CatalogService } from '@app/services/catalog.service';
import { I18N } from '@app/app-i18n';

@Component({
  selector: 'gt-user-collection-editor',
  templateUrl: './user-collection-editor.component.html',
  styleUrls: ['./user-collection-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class UserCollectionEditorComponent {
  private readonly toastService = inject(ToastService);
  private readonly cds = inject(CatalogService);

  @Input({ required: true }) collectionId!: number;

  /** Emitted when the panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  readonly i18n = I18N.userCollectionEditorComponent;

  deleteConfirmationFlag = false;

  close(): void {
    this.closeRequest.emit();
  }

  toggleDeleteConfirmationFlag($event: Event): void {
    this.deleteConfirmationFlag = ($event.target as HTMLInputElement)?.checked;
  }

  async delete(): Promise<void> {
    if (!this.deleteConfirmationFlag) {
      this.toastService.warning(this.i18n.actionConfirmationPrompt);
      return;
    }
    try {
      await this.cds.deleteUserCollection(this.collectionId);
    } catch (err) {
      console.error('Failed to delete collection', err);
      this.toastService.warning(this.i18n.failedToRemoveCollection);
      return;
    }
    this.toastService.info(this.i18n.collectionWasRemoved);
    this.close();
  }
}
