import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NODE_BB_LOGIN_URL, NODE_BB_REGISTRATION_URL} from '@common/constants';

@Component({
  selector: 'gt-user-registration-prompt',
  templateUrl: './user-registration-prompt.component.html',
  styleUrls: ['./user-registration-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRegistrationPromptComponent {
  readonly loginLink = NODE_BB_LOGIN_URL;
  readonly registrationLink = NODE_BB_REGISTRATION_URL;
}
