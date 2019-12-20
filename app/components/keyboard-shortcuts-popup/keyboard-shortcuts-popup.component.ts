import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {PopoverRef} from '@app/popover/popover-ref';

export type KeyboardShortcutsPage = 'song';

@Component({
  selector: 'gt-keyboard-shortcuts-popup',
  templateUrl: './keyboard-shortcuts-popup.component.html',
  styleUrls: ['./keyboard-shortcuts-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyboardShortcutsPopupComponent {
  @Input() page!: KeyboardShortcutsPage;
  @Input() popover!: PopoverRef;
}
