import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {UserSessionState} from '@app/store/user-session-state';
import {Subject} from 'rxjs';
import {UserDataService} from '@app/services/user-data.service';
import {AuthService} from '@app/services/auth.service';
import {takeUntil} from 'rxjs/operators';
import {Playlist, User} from '@common/user-model';
import {MOUNT_PLAYLIST_PREFIX} from '@common/mounts';

@Component({
  selector: 'gt-add-song-to-playlist',
  templateUrl: './add-song-to-playlist.component.html',
  styleUrls: ['./add-song-to-playlist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddSongToPlaylistComponent implements OnInit, OnDestroy {

  @Input() songId!: number;

  playlists: Playlist[] = [];

  readonly playlistLinkPrefix = `/${MOUNT_PLAYLIST_PREFIX}`;

  readonly favPlaylistName = 'Избранное';

  private readonly destroyed$ = new Subject();

  private user?: User;

  constructor(private readonly session: UserSessionState,
              private readonly uds: UserDataService,
              private readonly authService: AuthService,
              private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    this.uds.getUserPlaylists()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(playlists => {
          this.playlists = playlists;
          this.cd.detectChanges();
        });
    this.session.user$
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.user = user;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy() {
    this.destroyed$.next();
  }

  trackById(idx: number, withId: { id: number }): number {
    return withId.id;
  }

  async togglePlaylist(playlistId: number) {
    if (!this.user) {
      this.authService.signIn();
      return;
    }
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) {
      console.error(`Playlist not found: ${playlistId}`);
      return;
    }
    if (playlist.songIds.includes(this.songId)) {
      playlist.songIds = playlist.songIds.filter(id => id != this.songId);
    } else {
      playlist.songIds.push(this.songId);
    }
    //todo: notify about network issues?
    this.uds.updateUserPlaylist(playlist);
  }

  toggleNewFavPlaylist() {
    if (!this.user) {
      this.authService.signIn();
      return;
    }
    //todo: notify about network issues?
    this.uds.createUserPlaylist({
      name: this.favPlaylistName,
      songIds: [this.songId],
    });
  }
}
