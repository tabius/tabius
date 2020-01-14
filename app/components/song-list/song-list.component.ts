import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Song} from '@common/catalog-model';
import {getSongPageLink, trackById} from '@common/util/misc-utils';
import {I18N} from '@app/app-i18n';

/** Song item model used by the component. */
interface SongItem {
  id: number,
  title: string,
  titleAttribute: string;
  link: string,
}

@Component({
  selector: 'gt-song-list',
  templateUrl: './song-list.component.html',
  styleUrls: ['./song-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent implements OnChanges {

  readonly trackById = trackById;

  readonly i18n = I18N.songListComponent;

  /** Active collection mount. If not defined, the primary song collection mount is used. */
  @Input() collectionMount?: string;

  /** List of primary and secondary songs for the collection. */
  @Input() songs!: Song[];

  /** If present the list will add 'primaryCollectionMount' part to the song page url. */
  @Input() primarySongCollectionMounts!: (string|undefined)[];

  /** If the collection is empty and 'showEmptyNotice' is true -> user will see an empty notice. */
  @Input() showEmptyNotice = false;

  /** Text of the empty notice. Used only if 'showEmptyNotice' is true. */
  @Input() emptyListMessage = this.i18n.listIsEmpty;

  songItems: SongItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['songs'] || changes['primarySongCollectionMounts'] || changes['collectionMount']) {
      this.songItems = [];
      if (this.songs.length !== this.primarySongCollectionMounts.length) {
        throw new Error(`Primary collection mounts count !== songs count: ${this.songs.length}, mounts: ${this.primarySongCollectionMounts.length}`);
      }
      for (let i = 0; i < this.songs.length; i++) {
        const song = this.songs[i];
        const primaryCollectionMount = this.primarySongCollectionMounts[i];
        const collectionMount = this.collectionMount || primaryCollectionMount;
        if (!primaryCollectionMount || !collectionMount) {
          throw new Error(`Primary collection mount not specified. Index: ${i}`);
        }
        this.songItems.push({
          id: song.id,
          title: song.title,
          titleAttribute: song.title + this.i18n.titleSuffix,
          link: getSongPageLink(collectionMount, song.mount, primaryCollectionMount),
        });
      }
    }
  }

}
