import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MOUNT_ARTISTS} from '@common/mounts';

@Component({
  selector: 'gt-site-home-page',
  templateUrl: 'site-home-page.component.html',
  styleUrls: ['site-home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHomePageComponent {
  readonly artistsLink = MOUNT_ARTISTS;
}
