import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Song} from '@common/catalog-model';
import {getSongPageLink} from '@common/util/misc-utils';

@Component({
  selector: 'gt-song-list',
  templateUrl: './song-list.component.html',
  styleUrls: ['./song-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent {

  readonly getSongPageLink = getSongPageLink;

  @Input() collectionMount!: string;
  @Input() songs!: Song[];
  @Input() showEmptyNotice = false;

  trackBySongId(index: number, song: Song): number {
    return song.id;
  }

}
