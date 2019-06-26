import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Artist, Song} from '@common/artist-model';
import {BehaviorSubject} from 'rxjs';
import {getNameFirstFormArtistName} from '@common/util/misc-utils';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent {

  /** The song. Required parameter. */
  @Input() song!: Song;

  /** Optional Artist parameter. If present the artist name is appended to the header. */
  @Input() artist?: Artist;

  readonly settingsVisible$ = new BehaviorSubject(false);

  toggleSettings() {
    this.settingsVisible$.next(!this.settingsVisible$.getValue());
  }

  getTitle(): string {
    return this.song.title + (this.artist ? ` - ${getNameFirstFormArtistName(this.artist)}` : '');
  }
}
