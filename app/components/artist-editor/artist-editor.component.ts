import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {getTranslitLowerCase} from '@common/util/seo-translit';
import {ArtistType} from '@common/artist-model';
import {ArtistDataService} from '@app/services/artist-data.service';
import {ToastService} from '@app/toast/toast.service';
import {MOUNT_ARTIST_PREFIX} from '@common/mounts';
import {Router} from '@angular/router';

@Component({
  selector: 'gt-artist-editor',
  templateUrl: './artist-editor.component.html',
  styleUrls: ['./artist-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistEditorComponent {

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  name = '';

  mount = '';

  constructor(private readonly ads: ArtistDataService,
              private readonly toastService: ToastService,
              private readonly router: Router,
  ) {
  }

  create() {
    this.createImpl().catch(err => {
      console.error(err);
      this.toastService.warning(`Ошибка: ${err}`);
    });
  }

  close() {
    this.closeRequest.emit();
  }

  onNameChanged() {
    this.mount = getTranslitLowerCase(this.name);
  }

  private async createImpl(): Promise<void> {
    //TODO: validate fields!
    //TODO: support Artist type selection.
    //TODO: support Artist image.
    const artist = await this.ads.createArtist({name: this.name, mount: this.mount, type: ArtistType.Person});
    this.close();
    this.router.navigate([MOUNT_ARTIST_PREFIX + artist.mount]).catch(err => console.error(err));
  }
}
