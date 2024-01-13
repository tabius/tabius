import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CatalogService } from '@app/services/catalog.service';
import { combineLatest } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { bound, countOccurrences, getCurrentNavbarHeight, getSongPageLink, isValidId, scrollToView } from '@common/util/misc-utils';
import { Song, SongDetails } from '@common/catalog-model';
import { ToastService } from '@app/toast/toast.service';
import { INVALID_ID } from '@common/common-constants';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import { I18N } from '@app/app-i18n';
import { getTranslitLowerCase } from '@common/util/seo-translit';
import { getFirstYoutubeVideoIdFromLinks } from '@common/util/media-links-utils';
import { getFullLink } from '@app/utils/url-utils';

export type SongEditorInitialFocusMode = 'title' | 'text' | 'none';
export type SongEditResultType = 'created' | 'updated' | 'deleted' | 'canceled' | 'moved';

export type SongEditResult = {
  type: SongEditResultType;
  /** Set only for the 'created' type. */
  song?: Song;
};

/** Embeddable song editor component. */
@Component({
  selector: 'gt-song-editor',
  templateUrl: './song-editor.component.html',
  styleUrls: ['./song-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongEditorComponent extends ComponentWithLoadingIndicator {
  /** ID of the edited song. Invalid ID (<=0) is used to activate Create mode. */
  @Input({ required: true }) songId!: number;

  /**
   * An active collection ID.
   * In 'create mode' this collection will become a primary song collection.
   */
  @Input({ required: true }) activeCollectionId!: number;

  /** If true, the component will trigger scrolling edit area into the view. */
  @Input() scrollIntoView = true;

  @Input() initialFocusMode: SongEditorInitialFocusMode = 'text';

  /** Emitted when a panel wants to be closed. */
  @Output() closeRequest = new EventEmitter<SongEditResult>();

  /** Emitted when song mount is changed right before the song is updated in DB and the editor is closed. */
  @Output() mountChangeBeforeUpdate = new EventEmitter<string>();

  readonly i18n = I18N.songEditorComponent;

  content = '';
  songTitle = '';
  mount = '';
  songUrlPrefix = '';
  mediaLinks = '';

  song?: Song;
  private details?: SongDetails;
  deleteConfirmationFlag = false;

  @ViewChild('textArea', { static: false, read: ElementRef }) private contentRef!: ElementRef;
  @ViewChild('firstFormElement', { static: false, read: ElementRef }) private titleElementRef!: ElementRef;

  constructor(private readonly cds: CatalogService, private readonly toastService: ToastService) {
    super();
    this.changes$
      .pipe(
        filter(changes => !!changes['songId'] || !!changes['activeCollectionId']),
        switchMap(() => {
          const song$ = this.cds.observeSong(this.songId);
          const songDetails$ = this.cds.getSongDetailsById(this.songId);
          const songCollection$ = song$.pipe(switchMap(song => this.cds.observeCollection(song?.collectionId)));
          const activeCollection$ = this.cds.observeCollection(this.activeCollectionId);
          return combineLatest([song$, songDetails$, songCollection$, activeCollection$]);
        }),
      )
      .subscribe(([song, details, songCollection, activeCollection]) => {
        if (this.isCreateMode) {
          if (!activeCollection) {
            return;
          }
          this.songUrlPrefix = getFullLink(`${getSongPageLink(activeCollection.mount, '')}`);
        } else {
          // Edit mode.
          if (!song || !details || !songCollection) {
            return; // todo: show error
          }
          this.song = song;
          this.details = details;
          this.songTitle = song.title;
          this.content = details ? details.content : '?';
          this.mediaLinks = details ? details.mediaLinks.join(' ') : '';
          this.mount = song.mount;
          this.songUrlPrefix = getFullLink(`${getSongPageLink(songCollection.mount, '')}`);
        }
        this.loaded = true;
        this.updateUIOnLoadedState();
        this.cdr.markForCheck();
      });
  }

  get isCreateMode(): boolean {
    return !isValidId(this.songId);
  }

  get isUpdateMode(): boolean {
    return !this.isCreateMode;
  }

  private updateUIOnLoadedState(): void {
    if (this.scrollIntoView && this.isBrowser) {
      setTimeout(() => {
        if (this.contentRef && this.contentRef.nativeElement) {
          if (this.initialFocusMode === 'text') {
            const textArea: HTMLTextAreaElement = this.contentRef.nativeElement;
            textArea.focus({ preventScroll: true });
            textArea.selectionEnd = 0;
          } else if (this.initialFocusMode === 'title') {
            this.titleElementRef.nativeElement.focus({ preventScroll: true });
          }
          scrollToView(this.titleElementRef.nativeElement, 10);
        }
      }, 200);
    }
  }

  create(): void {
    if (!this.isCreateMode) {
      return;
    }
    if (this.songTitle.length === 0) {
      this.toastService.warning(this.i18n.toasts.songTitleIsRequired);
      return;
    }
    if (this.content.length === 0) {
      this.toastService.warning(this.i18n.toasts.songTextIsRequired);
      return;
    }
    this.createImpl().catch((err: Error) => {
      this.toastService.warning(`${this.i18n.toasts.failedToCreateSongPrefix}${err.message}`);
    });
  }

  private async createImpl(): Promise<void> {
    const song: Song = {
      id: INVALID_ID,
      version: 0,
      mount: this.mount,
      title: this.songTitle,
      collectionId: this.activeCollectionId,
    };
    const songDetails: SongDetails = {
      id: INVALID_ID,
      version: 0,
      content: this.content,
      mediaLinks: this.getMediaLinksAsArrayOrThrowError(),
    };
    const createdSong = await this.cds.createSong(song, songDetails);
    this.close({ type: 'created', song: createdSong });
  }

  private getMediaLinksAsArrayOrThrowError(): string[] {
    if (this.mediaLinks.trim().length === 0) {
      return [];
    }
    const youtubeId = getFirstYoutubeVideoIdFromLinks([this.mediaLinks]);
    if (!youtubeId) {
      throw new Error(this.i18n.errors.failedToParseYoutubeId);
    }
    return [youtubeId];
  }

  update(): void {
    this.updateImpl()
      .then(changedAndSaved => {
        if (changedAndSaved) {
          this.toastService.info(this.i18n.toasts.saved);
        }
      })
      .catch((err: Error) => {
        this.toastService.warning(`${this.i18n.toasts.failedToSavePrefix}${err.message}`);
      });
  }

  /** Returns true if there were changes to the song and the update was successful. */
  private async updateImpl(): Promise<boolean> {
    if (this.isCreateMode || !this.song || !this.details) {
      return false;
    }
    if (!this.isChanged()) {
      this.close({ type: 'canceled' });
      return false;
    }
    if (this.mount !== this.song.mount) {
      this.mountChangeBeforeUpdate.emit(this.mount);
    }
    const updatedSong: Song = { ...this.song, title: this.songTitle, mount: this.mount };
    const updatedDetails: SongDetails = {
      ...this.details,
      content: this.content,
      mediaLinks: this.getMediaLinksAsArrayOrThrowError(),
    };
    // wait until the update is finished with no errors before closing the editor.
    await this.cds.updateSong(updatedSong, updatedDetails);
    this.close({ type: 'updated' });
    return true;
  }

  private isChanged(): boolean {
    if (this.isCreateMode) {
      return this.songTitle !== '' || this.content !== '' || this.mediaLinks !== '';
    }
    if (!this.song || !this.details) {
      return false;
    }
    return (
      this.song.title !== this.songTitle ||
      this.details.content !== this.content ||
      this.details.mediaLinks.join(' ') !== this.mediaLinks ||
      this.song.mount !== this.mount
    );
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Enter' && event.ctrlKey) {
      if (this.isCreateMode) {
        this.create();
      } else {
        this.update();
      }
    } else if (event.key === 'Escape') {
      // todo: ask about closing confirmation
      if (!this.isChanged() || this.isCreateMode) {
        this.close({ type: 'canceled' });
      }
    }
  }

  getContentRowsCount(): number {
    if (typeof window !== 'object') {
      return 100;
    }
    // simple heuristic that works (can be improved later if needed).
    const headerHeight = getCurrentNavbarHeight();
    const titleInputHeight = 28;
    const mediaLinksRowHeight = 28;
    const mountRowHeight = 28;
    const buttonsRowHeight = 28;
    const textAreaLineHeight = 20;
    const textAreaPadding = 7;
    const header2TitleMargin = 10;
    const title2ContentMargin = 10;
    const content2LinksMargin = 10;
    const mediaLinks2MountMargin = 5;
    const mount2ButtonsMargin = 5;
    const buttons2BottomMargin = 10;
    const availableHeight =
      window.innerHeight -
      (headerHeight +
        header2TitleMargin +
        titleInputHeight +
        title2ContentMargin +
        content2LinksMargin +
        mediaLinksRowHeight +
        mediaLinks2MountMargin +
        mountRowHeight +
        mount2ButtonsMargin +
        buttonsRowHeight +
        buttons2BottomMargin);
    return bound(8, countOccurrences(this.content, '\n') + 1, (availableHeight - 2 * textAreaPadding) / textAreaLineHeight);
  }

  cancel(): void {
    this.close({ type: 'canceled', song: this.song });
  }

  close(result: SongEditResult): void {
    this.closeRequest.emit(result);
  }

  toggleDeleteConfirmationFlag($event: Event): void {
    this.deleteConfirmationFlag = ($event.target as HTMLInputElement).checked;
  }

  async delete(): Promise<void> {
    if (!this.deleteConfirmationFlag) {
      this.toastService.warning(this.i18n.toasts.deleteConfirmationIsRequired);
      return;
    }
    try {
      await this.cds.deleteSong(this.songId, this.activeCollectionId);
    } catch (err) {
      this.toastService.warning(this.i18n.toasts.failedToDeleteSong);
      return;
    }
    this.toastService.info(this.i18n.toasts.songWasDeleted);
    this.close({ type: 'deleted' });
  }

  onSongMovedToAnotherCollection(): void {
    this.close({ type: 'moved' });
  }

  onTitleChanged(): void {
    this.mount = getTranslitLowerCase(this.songTitle);
  }
}
