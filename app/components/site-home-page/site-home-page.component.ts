import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LINK_CATALOG, LINK_STUDIO } from '@common/mounts';
import { I18N } from '@app/app-i18n';
import { TELEGRAM_CHANNEL_URL } from '@app/app-constants';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';
import { environment } from '@app/environments/environment';

@Component({
    templateUrl: 'site-home-page.component.html',
    styleUrls: ['site-home-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SiteHomePageComponent extends AbstractAppComponent {
  readonly forumNewsLink = TELEGRAM_CHANNEL_URL;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly i18n = I18N.homePage;

  constructor() {
    super();
    this.updatePageMetadata({
      ...I18N.common.meta,
      image: `${environment.url}/assets/site-logo.png`,
    });
  }
}
