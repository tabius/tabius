import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FORUM_LINK_ADD_NEW_CATEGORY} from '@common/mounts';

@Component({
  selector: 'gt-moderator-prompt',
  templateUrl: './moderator-prompt.component.html',
  styleUrls: ['./moderator-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModeratorPromptComponent {
  readonly addNewCategoryLink = FORUM_LINK_ADD_NEW_CATEGORY;
}
