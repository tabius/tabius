import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NODE_BB_ADD_NEW_CATEGORY_URL} from '@common/constants';

@Component({
  selector: 'gt-moderator-prompt',
  templateUrl: './moderator-prompt.component.html',
  styleUrls: ['./moderator-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModeratorPromptComponent {
  readonly addNewCategoryLink = NODE_BB_ADD_NEW_CATEGORY_URL;
}
