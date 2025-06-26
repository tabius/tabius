import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { getTranslitLowerCase } from '@common/util/seo-translit';
import { CollectionType } from '@common/catalog-model';
import { CatalogService } from '@app/services/catalog.service';
import { ToastService } from '@app/toast/toast.service';
import { MOUNT_COLLECTION_PREFIX } from '@common/mounts';
import { Router } from '@angular/router';
import { I18N } from '@app/app-i18n';
import { BrowserStateService } from '@app/services/browser-state.service';
import { scrollToView } from '@app/utils/misc-utils';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'gt-collection-editor',
  templateUrl: './collection-editor.component.html',
  styleUrls: ['./collection-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CollectionEditorComponent implements OnInit {
  private readonly cds = inject(CatalogService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly bss = inject(BrowserStateService);

  @Input() scrollIntoViewAndFocus = true;

  /** Emitted when a panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  @ViewChild('editorBlock', { static: false, read: ElementRef }) private editorBlockRef!: ElementRef;
  @ViewChild('collectionNameInput', { static: false, read: ElementRef }) private collectionNameInputRef!: ElementRef;

  readonly i18n = I18N.collectionEditor;

  name = '';

  mount = '';

  collectionType: CollectionType = CollectionType.Person;

  readonly CollectionType = CollectionType;

  ngOnInit(): void {
    if (this.scrollIntoViewAndFocus && this.bss.isBrowser) {
      setTimeout(() => {
        if (this.editorBlockRef && this.editorBlockRef.nativeElement) {
          scrollToView(this.editorBlockRef.nativeElement, 10);
          if (this.collectionNameInputRef && this.collectionNameInputRef.nativeElement) {
            this.collectionNameInputRef.nativeElement.focus();
          }
        }
      }, 200);
    }
  }

  async create(): Promise<void> {
    try {
      await this.createImpl();
    } catch (error) {
      console.error('Error:', error);
      const message = (error as HttpErrorResponse).error?.message || I18N.common.failedToCreateCollection;
      this.toastService.warning(I18N.common.error(message));
    }
  }

  close(): void {
    this.closeRequest.emit();
  }

  onNameChanged(): void {
    this.mount = getTranslitLowerCase(this.name);
  }

  private async createImpl(): Promise<void> {
    //TODO: validate fields!
    //TODO: support Collection image.
    const collection = await this.cds.createListedCollection({
      name: this.name,
      mount: this.mount,
      type: this.collectionType,
    });
    this.close();
    this.router.navigate([MOUNT_COLLECTION_PREFIX + collection.mount]).catch(err => console.error(err));
  }
}
