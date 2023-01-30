import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Injector, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {combineLatest} from 'rxjs';
import {flatMap, takeUntil} from 'rxjs/operators';
import {assertTruthy, bound, countOccurrences, getCurrentNavbarHeight, getFullLink, getSongPageLink, isValidId, scrollToView} from '@common/util/misc-utils';
import {Song, SongDetails} from '@common/catalog-model';
import {ToastService} from '@app/toast/toast.service';
import {INVALID_ID} from '@common/common-constants';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {I18N} from '@app/app-i18n';
import {getTranslitLowerCase} from '@common/util/seo-translit';
import {getFirstYoutubeVideoIdFromLinks} from '@common/util/media-links-utils';

export type SongEditorInitialFocusMode = 'title'|'text'|'none';
export type SongEditResultType = 'created'|'updated'|'deleted'|'canceled'|'moved'

export type SongEditResult = {
  type: SongEditResultType;
  /** Set only for the 'created' type. */
  song?: Song;
}

/** Embeddable song editor component. */
@Component({
  selector: 'gt-song-editor',
  templateUrl: './song-editor.component.html',
  styleUrls: ['./song-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent extends ComponentWithLoadingIndicator implements OnInit, OnChanges, OnDestroy {

  /** ID of the edited song. Invalid ID (<=0) for new songs. */
  @Input() songId!: number;

  /** Current collection: will become a primary collection for a new song.*/
  @Input() activeCollectionId!: number;

  /** If true, component will trigger scrolling edit area into the view. */
  @Input() scrollIntoView = true;

  @Input() initialFocusMode: SongEditorInitialFocusMode = 'text';

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter<SongEditResult>();

  /** Emitted when song mount is changed right before the song is updated in DB and the editor is closed. */
  @Output() onMountChangeBeforeUpdate = new EventEmitter<string>();

  readonly i18n = I18N.songEditorComponent;

  content = '';
  title = '';
  mount = '';
  songUrlPrefix = '';
  mediaLinks = '';
  createMode = false;

  song?: Song;
  private details?: SongDetails;
  deleteConfirmationFlag = false;

  @ViewChild('textArea', {static: false, read: ElementRef}) private contentRef!: ElementRef;
  @ViewChild('firstFormElement', {static: false, read: ElementRef}) private titleElementRef!: ElementRef;

  constructor(private readonly cds: CatalogService,
              private readonly toastService: ToastService,
              injector: Injector,
  ) {
    super(injector);
  }

  ngOnChanges(): void {
    assertTruthy(this.activeCollectionId);
  }

  ngOnInit(): void {
    assertTruthy(this.activeCollectionId);
    this.createMode = !isValidId(this.songId);
    if (this.createMode) {
      const collection$ = this.cds.getCollectionById(this.activeCollectionId);
      collection$
          .pipe(takeUntil(this.destroyed$))
          .subscribe(collection => {
            if (!collection) {
              return; // todo: show error
            }
            this.songUrlPrefix = getFullLink(`${getSongPageLink(collection.mount, '')}`);
            this.loaded = true;
            this.updateUIOnLoadedState();
          });
    } else {
      const song$ = this.cds.getSongById(this.songId);
      const songDetails$ = this.cds.getSongDetailsById(this.songId);
      const collection$ = song$.pipe(flatMap(song => this.cds.getCollectionById(song && song.collectionId)));
      combineLatest([song$, songDetails$, collection$])
          .pipe(takeUntil(this.destroyed$))
          .subscribe(([song, details, collection]) => {
            if (!song || !details || !collection) {
              return; // todo: show error
            }
            this.song = song;
            this.details = details;
            this.title = song.title;
            this.content = details ? details.content : '?';
            this.mediaLinks = details ? details.mediaLinks.join(' ') : '';
            this.mount = song.mount;
            this.songUrlPrefix = getFullLink(`${getSongPageLink(collection.mount, '')}`);
            this.loaded = true;
            this.updateUIOnLoadedState();
            this.cd.detectChanges();
          });
    }
  }

  private updateUIOnLoadedState(): void {
    if (this.scrollIntoView && this.isBrowser) {
      setTimeout(() => {
        if (this.contentRef && this.contentRef.nativeElement) {
          if (this.initialFocusMode === 'text') {
            const textArea: HTMLTextAreaElement = this.contentRef.nativeElement;
            textArea.focus({preventScroll: true});
            textArea.selectionEnd = 0;
          } else if (this.initialFocusMode === 'title') {
            this.titleElementRef.nativeElement.focus({preventScroll: true});
          }
          scrollToView(this.titleElementRef.nativeElement, 10);
        }
      }, 200);
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  create(): void {
    if (!this.createMode) {
      return;
    }
    if (this.title.length === 0) {
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
    const song: Song = {id: INVALID_ID, version: 0, mount: this.mount, title: this.title, collectionId: this.activeCollectionId};
    const songDetails: SongDetails = {id: INVALID_ID, version: 0, content: this.content, mediaLinks: this.getMediaLinksAsArrayOrThrowError()};
    const createdSong = await this.cds.createSong(song, songDetails);
    this.close({type: 'created', song: createdSong});
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

  /** Returns true if there were changes to the song and saving was successful. */
  private async updateImpl(): Promise<boolean> {
    if (this.createMode || !this.song || !this.details) {
      return false;
    }
    if (!this.isChanged()) {
      this.close({type: 'canceled'});
      return false;
    }
    if (this.mount !== this.song.mount) {
      this.onMountChangeBeforeUpdate.emit(this.mount);
    }
    const updatedSong: Song = {...this.song, title: this.title, mount: this.mount};
    const updatedDetails: SongDetails = {...this.details, content: this.content, mediaLinks: this.getMediaLinksAsArrayOrThrowError()};
    // wait until the update is finished with no errors before closing the editor.
    await this.cds.updateSong(updatedSong, updatedDetails);
    this.close({type: 'updated'});
    return true;
  }

  private isChanged(): boolean {
    if (this.createMode) {
      return this.title !== '' || this.content !== '' || this.mediaLinks !== '';
    }
    if (!this.song || !this.details) {
      return false;
    }
    return this.song.title !== this.title
        || this.details.content !== this.content
        || this.details.mediaLinks.join(' ') !== this.mediaLinks
        || this.song.mount !== this.mount;
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.ctrlKey) {
      if (this.createMode) {
        this.create();
      } else {
        this.update();
      }
    } else if (event.key === 'Escape') {
      // todo: ask about closing confirmation
      if (!this.isChanged() || this.createMode) {
        this.close({type: 'canceled'});
      }
    }
  }

  getContentRowsCount(): number {
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
    const availableHeight = window.innerHeight -
        (headerHeight + header2TitleMargin + titleInputHeight + title2ContentMargin +
            content2LinksMargin + mediaLinksRowHeight + mediaLinks2MountMargin + mountRowHeight + mount2ButtonsMargin + buttonsRowHeight + buttons2BottomMargin);
    return bound(8, countOccurrences(this.content, '\n') + 1, (availableHeight - 2 * textAreaPadding) / textAreaLineHeight);
  }

  cancel() {
    this.close({type: 'canceled', song: this.song});
  }

  close(result: SongEditResult): void {
    this.closeRequest.emit(result);
  }

  toggleDeleteConfirmationFlag($event): void {
    this.deleteConfirmationFlag = $event.target.checked;
  }

  async delete(): Promise<void> {
    if (!this.deleteConfirmationFlag) {
      this.toastService.warning(this.i18n.toasts.deleteConfirmationIsRequired);
      return;
    }
    try {
      await this.cds.deleteSong(this.songId);
    } catch (err) {
      this.toastService.warning(this.i18n.toasts.failedToDeleteSong);
      return;
    }
    this.toastService.info(this.i18n.toasts.songWasDeleted);
    this.close({type: 'deleted'});
  }

  onSongMovedToAnotherCollection(): void {
    this.close({type: 'moved'});
  }

  onTitleChanged(): void {
    this.mount = getTranslitLowerCase(this.title);
  }
}
