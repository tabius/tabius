import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {takeUntil} from 'rxjs/operators';
import {bound, countOccurrences, isValidId, scrollToView} from '@common/util/misc-utils';
import {Song, SongDetails} from '@common/artist-model';
import {ToastService} from '@app/toast/toast.service';
import {DESKTOP_NAV_HEIGHT, INVALID_ID, MIN_DESKTOP_WIDTH, MOBILE_NAV_HEIGHT} from '@common/constants';

export type SongEditorInitialFocusMode = 'title'|'text'|'none';

/** Embeddable song editor component. */
@Component({
  selector: 'gt-song-editor',
  templateUrl: './song-editor.component.html',
  styleUrls: ['./song-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit, OnDestroy {

  /** Id of the edited song.*/
  @Input() songId!: number;

  /** Must be provided for create mode only (when songId is not defined).*/
  @Input() artistId!: number;

  /** If true, component will trigger scrolling edit area into the view. */
  @Input() scrollIntoView = true;

  @Input() fullWidth = true;

  @Input() initialFocusMode: SongEditorInitialFocusMode = 'text';

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  readonly destroyed$ = new Subject();

  loaded = false;
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);
  content = '';
  title = '';
  mediaLinks = '';
  createMode = false;

  private song?: Song;
  private details?: SongDetails;
  deleteConfirmationFlag = false;

  @ViewChild('textArea', {static: false, read: ElementRef}) private contentRef!: ElementRef;
  @ViewChild('firstFormElement', {static: false, read: ElementRef}) private titleElementRef!: ElementRef;

  constructor(private readonly ads: ArtistDataService,
              private readonly toastService: ToastService,
  ) {
  }

  ngOnInit(): void {
    this.createMode = !isValidId(this.songId);
    if (this.createMode) {
      if (!isValidId(this.artistId)) {
        throw 'Artist ID not provided!';
      }
      this.loaded = true;
      this.updateUIOnLoadedState();
    } else {
      enableLoadingIndicator(this);
      combineLatest([this.ads.getSongById(this.songId), this.ads.getSongDetailsById(this.songId)])
          .pipe(takeUntil(this.destroyed$))
          .subscribe(([song, details]) => {
            if (song === undefined || details === undefined) {
              return; // todo:
            }
            this.song = song;
            this.details = details;
            this.title = song.title;
            this.content = details ? details.content : '?';
            this.mediaLinks = details ? details.mediaLinks.join(' ') : '';
            this.loaded = true;
            this.updateUIOnLoadedState();
          });
    }
  }

  private updateUIOnLoadedState(): void {
    if (this.scrollIntoView) {
      setTimeout(() => {
        if (this.contentRef && this.contentRef.nativeElement) {
          if (this.initialFocusMode === 'text') {
            const textArea: HTMLTextAreaElement = this.contentRef.nativeElement;
            textArea.focus({preventScroll: true});
            textArea.selectionEnd = 0;
          } else if (this.initialFocusMode === 'title') {
            this.titleElementRef.nativeElement.focus({preventScroll: true});
          }
          scrollToView(this.titleElementRef.nativeElement);
        }
      }, 200);
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }


  create(): void {
    if (!this.createMode) {
      return;
    }
    if (this.title.length === 0) {
      this.toastService.warning('Необходимо указать название песни');
      return;
    }
    if (this.content.length == 0) {
      this.toastService.warning('Текст песни не может быть пуст');
      return;
    }
    this.createImpl().catch(err => {
      this.toastService.warning(`Ошибка: ${err}`);
    });
  }

  private async createImpl(): Promise<void> {
    const createdSong: Song = {id: INVALID_ID, version: 0, mount: '', title: this.title, artistId: this.artistId, tid: INVALID_ID};
    const createdDetails: SongDetails = {id: INVALID_ID, version: 0, content: this.content, mediaLinks: this.getMediaLinksAsArray()};
    await this.ads.createSong(createdSong, createdDetails);
    this.close();
  }

  private getMediaLinksAsArray(): string[] {
    return this.mediaLinks.split(' ').filter(l => l.length > 0);
  }

  update(): void {
    this.updateImpl()
        .then(changedAndSaved => {
          if (changedAndSaved) {
            this.toastService.info('Изменения сохранены');
          }
        })
        .catch(err => {
          this.toastService.warning(`Ошибка: ${err}`);
        });
  }

  /** Returns true if there were changes to the song and saving was successful. */
  private async updateImpl(): Promise<boolean> {
    if (this.createMode || !this.song || !this.details) {
      return false;
    }
    const changed = this.isChanged();
    if (changed) {
      const updatedSong: Song = {...this.song, title: this.title};
      const updatedDetails: SongDetails = {...this.details, content: this.content, mediaLinks: this.getMediaLinksAsArray()};
      await this.ads.updateSong(updatedSong, updatedDetails);
    }
    this.close();
    return changed;
  }

  private isChanged(): boolean {
    if (this.createMode) {
      return this.title !== '' || this.content !== '' || this.mediaLinks !== '';
    }
    if (!this.song || !this.details) {
      return false;
    }
    return this.song.title !== this.title || this.details.content !== this.content || this.details.mediaLinks.join(' ') !== this.mediaLinks;
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
      if (!this.isChanged()) {
        this.close();
      }
    }
  }

  getContentRowsCount(): number {
    // simple heuristic that works (can be improved later if needed).
    const headerHeight = window.innerWidth >= MIN_DESKTOP_WIDTH ? DESKTOP_NAV_HEIGHT : MOBILE_NAV_HEIGHT;
    const titleInputHeight = 28;
    const linksRowHeight = 28;
    const buttonsRowHeight = 28;
    const textAreaLineHeight = 20;
    const textAreaPadding = 7;
    const header2TitleMargin = 10;
    const title2ContentMargin = 10;
    const content2LinksMargin = 10;
    const links2ButtonsMargin = 10;
    const buttons2BottomMargin = 10;
    const availableHeight = window.innerHeight - (headerHeight + header2TitleMargin + titleInputHeight + title2ContentMargin +
        content2LinksMargin + linksRowHeight + links2ButtonsMargin + buttonsRowHeight + buttons2BottomMargin);
    return bound(8, countOccurrences(this.content, '\n') + 1, (availableHeight - 2 * textAreaPadding) / textAreaLineHeight);
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
      await this.ads.deleteSong(this.songId);
    } catch (err) {
      this.toastService.warning('Ошибка при удалении песни!');
      return;
    }
    this.close();
    this.toastService.info('Песня удалена!');
  }
}
