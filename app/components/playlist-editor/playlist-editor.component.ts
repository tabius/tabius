import {ChangeDetectionStrategy, Component} from '@angular/core';
import {UserDataService} from '@app/services/user-data.service';
import {Playlist} from '@common/user-model';
import {Observable} from 'rxjs';
import {ToastService} from '@app/toast/toast.service';
import {MSG_NETWORK_ERROR} from '@common/messages';
import {getPlaylistPageLink} from '@common/util/misc-utils';


@Component({
  selector: 'gt-playlist-editor',
  templateUrl: './playlist-editor.component.html',
  styleUrls: ['./playlist-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistEditorComponent {

  readonly getPlaylistPageLink = getPlaylistPageLink;
  readonly playlists$: Observable<Playlist[]>;

  newPlaylistName = '';

  constructor(private uds: UserDataService,
              private readonly toastService: ToastService,
  ) {
    this.playlists$ = this.uds.getUserPlaylists();
  }

  createPlaylist(): void {
    const request = {name: this.newPlaylistName, shared: true, songIds: [],};
    this.uds.createPlaylist(request)
        .catch(err => this.toastService.warning(err, MSG_NETWORK_ERROR));
  }

  deletePlaylist(playlist: Playlist): void {
    this.uds.deleteUserPlaylist(playlist.id)
        .catch(err => this.toastService.warning(err, MSG_NETWORK_ERROR));
  }

}
