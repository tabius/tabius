import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Collection, Song} from '@common/catalog-model';
import {getCollectionPageLink, getSongPageLink, trackById} from '@common/util/misc-utils';
import {I18N} from '@app/app-i18n';

/** Song item model used by the component. */
interface SongItem {
  id: number,
  title: string,
  titleAttribute: string;
  link: string,
  showPrimaryCollectionLink: boolean;
  primaryCollectionLink: string;
  primaryCollectionName: string;
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

  /** Active collection mount. If not defined, primarySongCollectionMounts[] must be defined and is used. */
  @Input() collectionMount?: string;

  /** List of primary and secondary songs for the collection. */
  @Input({required: true}) songs!: Song[];

  /** If to show a link to the primary song collection in case if it's different from the current one. */
  @Input() showPrimaryCollectionLinks = true;

  /**
   * If present and not equal to `collectionMount`, the list will add 'primaryCollectionMount' part to the song page url.
   * Used to optimize component rendering.
   */
  @Input() primarySongCollections!: (Collection|undefined)[];

  /** If the collection is empty and 'showEmptyNotice' is true -> user will see an empty notice. */
  @Input() showEmptyNotice = false;

  /** Text of the empty notice. Used only if 'showEmptyNotice' is true. */
  @Input() emptyListMessage = this.i18n.listIsEmpty;

  songItems: SongItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['songs'] || changes['primarySongCollectionMounts'] || changes['collectionMount']) {
      this.songItems = [];
      if (this.songs.length !== this.primarySongCollections.length) {
        throw new Error(`Primary collection mounts count !== songs count: ${this.songs.length}, mounts: ${this.primarySongCollections.length}`);
      }
      for (let i = 0; i < this.songs.length; i++) {
        const song = this.songs[i];
        const primaryCollection = this.primarySongCollections[i];
        const primaryCollectionMount = primaryCollection && primaryCollection.mount;
        const collectionMount = this.collectionMount || primaryCollectionMount;
        if (!collectionMount) {
          console.error(`Collection mount is undefined! song: ${song.title}/${song.id}, p: ${primaryCollectionMount}, c: ${collectionMount}`);
          continue;
        }
        this.songItems.push({
          id: song.id,
          title: song.title,
          titleAttribute: song.title + this.i18n.songLinkTitleSuffix,
          link: getSongPageLink(collectionMount, song.mount, primaryCollectionMount),
          showPrimaryCollectionLink: this.showPrimaryCollectionLinks && !!primaryCollection && collectionMount !== primaryCollectionMount,
          primaryCollectionLink: primaryCollection ? getCollectionPageLink(primaryCollection) : '',
          primaryCollectionName: primaryCollection ? primaryCollection.name : '',
        });
      }
    }
  }

}
