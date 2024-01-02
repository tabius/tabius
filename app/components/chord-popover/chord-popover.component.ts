import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { getChordsDiscussionUrl } from '@common/util/misc-utils';
import { ChordLayout } from '@app/utils/chords-layout-lib';
import { PopoverRef } from '@app/popover/popover-ref';
import { I18N } from '@app/app-i18n';
import { getDefaultH4SiFlag } from '@common/user-model';
import { convertChordToFingerPositions, playChordSound } from '@app/utils/chord-player';

@Component({
  selector: 'gt-chord-popover',
  templateUrl: './chord-popover.component.html',
  styleUrls: ['./chord-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordPopoverComponent {

  @Input({ required: true }) chordLayout!: ChordLayout;
  @Input() h4Si = getDefaultH4SiFlag();
  @Input({ required: true }) popover!: PopoverRef;

  readonly chordDiscussionUrl = getChordsDiscussionUrl();

  readonly i18n = I18N.chordPopover;

  playChord(): void {
    const fingers = convertChordToFingerPositions(this.chordLayout.positions);
    playChordSound(fingers);
  }
}
