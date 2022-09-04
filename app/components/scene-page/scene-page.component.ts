import {ChangeDetectionStrategy, Component} from '@angular/core';
import {I18N} from '@app/app-i18n';

@Component({
  templateUrl: './scene-page.component.html',
  styleUrls: ['./scene-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScenePageComponent {
  readonly i18n = I18N.scenePage;
}
