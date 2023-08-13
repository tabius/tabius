import {ChangeDetectionStrategy, Component} from '@angular/core';
import {LINK_CATALOG, LINK_STUDIO} from '@common/mounts';
import {I18N} from '@app/app-i18n';
import {TELEGRAM_CHANNEL_URL} from '@app/app-constants';

@Component({
  templateUrl: 'site-home-page.component.html',
  styleUrls: ['site-home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHomePageComponent {
  readonly forumNewsLink = TELEGRAM_CHANNEL_URL;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly i18n = I18N.homePage;
}
