import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NODE_BB_ADD_NEW_CATEGORY_URL} from '@app/app-constants';
import {I18N} from '@app/app-i18n';

@Component({
  selector: 'gt-moderator-prompt',
  templateUrl: './moderator-prompt.component.html',
  styleUrls: ['./moderator-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModeratorPromptComponent {
  readonly addNewCategoryLink = NODE_BB_ADD_NEW_CATEGORY_URL;
  readonly i18n = I18N.moderatorPrompt;
}
