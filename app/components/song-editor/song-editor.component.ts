import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {throttleIndicator} from '@app/utils/component-utils';
import {takeUntil} from 'rxjs/operators';
import {bound, countOccurrences, isValidId, scrollToView} from '@common/util/misc-utils';
import {Song, SongDetails} from '@common/artist-model';
import {ToastService} from '@app/toast/toast.service';
import {MOUNT_ARTISTS} from '@common/mounts';
import {Router} from '@angular/router';
import {DESKTOP_NAV_HEIGHT, INVALID_ID, MIN_DESKTOP_WIDTH, MOBILE_NAV_HEIGHT} from '@common/constants';

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
  @Input() scrollIntoView = false;

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
  @ViewChild('firstFormElement', {static: false, read: ElementRef}) private firstFormElementRef!: ElementRef;

  constructor(private readonly ads: ArtistDataService,
              private readonly toastService: ToastService,
              private readonly router: Router,
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
      throttleIndicator(this);
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
          const textArea: HTMLTextAreaElement = this.contentRef.nativeElement;
          textArea.focus({preventScroll: true});
          textArea.selectionEnd = 0;
          scrollToView(this.firstFormElementRef.nativeElement);
        }
      }, 200);
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }


  async create(): Promise<void> {
    if (!this.createMode || this.title.length === 0 || this.content === ' ') {
      return;
    }
    try {
      const createdSong: Song = {id: INVALID_ID, version: 0, mount: '', title: this.title, artistId: this.artistId, tid: INVALID_ID};
      const createdDetails: SongDetails = {id: INVALID_ID, version: 0, content: this.content, mediaLinks: this.getMediaLinksAsArray()};
      await this.ads.createSong(createdSong, createdDetails);
      this.close();
    } catch (err) {
      this.toastService.warning(`Ошибка: ${err}`);
    }
  }

  private getMediaLinksAsArray(): string[] {
    return this.mediaLinks.split(' ').filter(l => l.length > 0);
  }

  async update(): Promise<void> {
    if (this.createMode || !this.details || !this.song ||
        (this.song.title === this.title && this.details.content === this.content && this.details.mediaLinks.join(' ') == this.mediaLinks)) {
      return;
    }
    try {
      const updatedSong: Song = {...this.song, title: this.title};
      const updatedDetails: SongDetails = {...this.details, content: this.content, mediaLinks: this.getMediaLinksAsArray()};
      await this.ads.updateSong(updatedSong, updatedDetails);
      this.close();
    } catch (err) {
      this.toastService.warning(`Ошибка: ${err}`);
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
    return bound(8, countOccurrences(this.content, '\n'), (availableHeight - 2 * textAreaPadding) / textAreaLineHeight);
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
    await this.ads.deleteSong(this.songId);
    this.close();
    this.toastService.info('Песня удалена!');
    await this.router.navigate([MOUNT_ARTISTS]);
  }
}
