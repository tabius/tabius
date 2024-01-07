import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PopoverRef } from '@app/popover/popover-ref';
import { HelpPageType } from '@app/services/help.service';
import { I18N } from '@app/app-i18n';

@Component({
  selector: 'gt-keyboard-shortcuts-popup',
  templateUrl: './keyboard-shortcuts-popup.component.html',
  styleUrls: ['./keyboard-shortcuts-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardShortcutsPopupComponent {
  @Input({ required: true }) page!: HelpPageType;
  @Input({ required: true }) popover!: PopoverRef;

  readonly i18n = I18N.shortcuts;
}
