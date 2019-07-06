import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MOUNT_ARTISTS} from '@common/mounts';
import {NODE_BB_URL} from '@common/constants';

@Component({
  selector: 'gt-site-home-page',
  templateUrl: 'site-home-page.component.html',
  styleUrls: ['site-home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHomePageComponent {
  readonly artistsLink = MOUNT_ARTISTS;
  readonly forumLink = NODE_BB_URL + "/category/1";
}
