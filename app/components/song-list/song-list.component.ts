import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Song} from '@common/catalog-model';
import {getSongPageLink} from '@common/util/misc-utils';

@Component({
  selector: 'gt-song-list',
  templateUrl: './song-list.component.html',
  styleUrls: ['./song-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent implements OnChanges {

  readonly getSongPageLink = getSongPageLink;

  /** Active collection. */
  @Input() collectionMount!: string;

  /** List of primary and secondary songs for the collection. */
  @Input() songs!: Song[];

  /** If present the list will add 'primaryCollectionMount' part to the song page url. */
  @Input() primarySongCollectionMounts!: (string|undefined)[];

  /** If the collection is empty and 'showEmptyNotice' is true -> user will see an empty notice. */
  @Input() showEmptyNotice = false;

  /** Text of the empty notice. Used only if 'showEmptyNotice' is true. */
  @Input() emptyListMessage = 'Нет песен';

  trackBySongId(index: number, song: Song): number {
    return song.id;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['songs'] || changes['primarySongCollectionMounts']) {
      if (!this.primarySongCollectionMounts || this.primarySongCollectionMounts.length != this.songs.length) {
        this.primarySongCollectionMounts = this.songs.map(s => undefined);
      }
    }
  }

}
