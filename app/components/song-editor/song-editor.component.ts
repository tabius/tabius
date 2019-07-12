import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {BehaviorSubject, Subject} from 'rxjs';
import {throttleIndicator} from '@app/utils/component-utils';
import {takeUntil} from 'rxjs/operators';
import {bound, countOccurrences} from '@common/util/misc-utils';
import {SongDetails} from '@common/artist-model';
import {ToastService} from '@app/toast/toast.service';

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

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  readonly destroyed$ = new Subject();

  loaded = false;
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);
  content = '';
  details?: SongDetails;

  constructor(private readonly ads: ArtistDataService,
              private readonly toastService: ToastService
  ) {
  }

  ngOnInit(): void {
    throttleIndicator(this);
    this.ads.getSongDetailsById(this.songId)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(details => {
          this.details = details;
          this.content = details ? details.content : '?';
          this.loaded = true;
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  async save(): Promise<void> {
    if (!this.details || this.details.content === this.content) {
      return;
    }
    try {
      await this.ads.updateSongDetails({...this.details, content: this.content});
      this.close();
    } catch (err) {
      this.toastService.warning(`Ошибка: ${err}`);
    }
  }

  getContentRowsCount(): number {
    return bound(8, countOccurrences(this.content, '\n'), window.innerHeight / 20 - 10); // simple heuristic that works (can be improved later if needed).
  }

  close(): void {
    this.closeRequest.emit();
  }
}
