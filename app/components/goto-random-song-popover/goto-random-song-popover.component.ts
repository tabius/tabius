import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {I18N} from '@app/app-i18n';
import {ShortcutsService} from '@app/services/shortcuts.service';
import {PopoverRef} from '@app/popover/popover-ref';

/** A mobile mode modal menu with 2 buttons: goto random song in the current collection or in the whole service. */
@Component({
  selector: 'gt-goto-random-song-popover',
  templateUrl: './goto-random-song-popover.component.html',
  styleUrls: ['./goto-random-song-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GotoRandomSongPopoverComponent {

  @Input() collectionId?: number;
  @Input() popover!: PopoverRef;

  readonly i18n = I18N.gotoRandomSongMenu;

  constructor(private readonly shortcutsService: ShortcutsService) {
  }

  gotoRandomSongInCurrentCollection(): void {
    this.close();
    this.collectionId && this.shortcutsService.gotoRandomSong(this.collectionId);
  }

  gotoRandomSongInService(): void {
    this.close();
    this.shortcutsService.gotoRandomSong();
  }

  close(): void {
    this.popover.close();
  }

}
