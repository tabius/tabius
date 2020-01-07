import {ChangeDetectionStrategy, Component} from '@angular/core';
import {LINK_CATALOG, LINK_STUDIO} from '@common/mounts';
import {NODE_BB_URL} from '@app/app-constants';
import {I18N} from '@app/app-i18n';

@Component({
  selector: 'gt-site-home-page',
  templateUrl: 'site-home-page.component.html',
  styleUrls: ['site-home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHomePageComponent {
  readonly forumNewsLink = `${NODE_BB_URL}/category/1`;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly i18n = I18N.homePage;
}
