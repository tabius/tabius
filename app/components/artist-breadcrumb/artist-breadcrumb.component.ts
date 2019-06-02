import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Artist} from '@common/artist-model';
import {MOUNT_ARTISTS} from '@common/mounts';

@Component({
  selector: 'gt-artist-breadcrumb',
  templateUrl: './artist-breadcrumb.component.html',
  styleUrls: ['./artist-breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistBreadcrumbComponent {

  @Input() artist?: Artist;
  @Input() showArtistLink = true;

  readonly artistsLink = MOUNT_ARTISTS;
}
