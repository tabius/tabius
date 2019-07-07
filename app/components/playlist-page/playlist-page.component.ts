import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injectable, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ActivatedRouteSnapshot, Resolve, Router} from '@angular/router';
import {Meta, Title} from '@angular/platform-browser';
import {Artist, Song} from '@common/artist-model';
import {flatMap, map, take, takeUntil, throttleTime} from 'rxjs/operators';
import {UserDataService} from '@app/services/user-data.service';
import {combineLatest, Observable, of, Subject} from 'rxjs';
import {MOUNT_PAGE_NOT_FOUND, MOUNT_USER_PLAYLISTS} from '@common/mounts';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {ArtistDataService} from '@app/services/artist-data.service';
import {Playlist} from '@common/user-model';
import {defined, getArtistPageLink, getNameFirstFormArtistName, getSongForumTopicLink, getSongPageLink, hasValidForumTopic} from '@common/util/misc-utils';
import {SongComponentMode} from '@app/components/song/song.component';

interface PlaylistSongModel {
  song: Song;
  artist: Artist;
  artistName: string;
  last: boolean;
}

@Component({
  selector: 'gt-playlist-page',
  templateUrl: './playlist-page.component.html',
  styleUrls: ['./playlist-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject();
  playlist!: Playlist;
  songItems: PlaylistSongModel[] = [];

  readonly mode = SongComponentMode.Playlist;
  readonly hasValidForumTopic = hasValidForumTopic;
  readonly getSongForumTopicLink = getSongForumTopicLink;
  readonly playlistsLink = `/${MOUNT_USER_PLAYLISTS}`;
  readonly getArtistPageLink = getArtistPageLink;
  readonly getSongPageLink = getSongPageLink;

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              private readonly ads: ArtistDataService,
              private readonly uds: UserDataService,
              private title: Title,
              private readonly meta: Meta,
  ) {
  }

  ngOnInit() {
    const pageInput = this.route.data['value'].input as PlaylistPageInput;
    this.playlist = pageInput.playlist;

    const playlist$ = this.uds.getPlaylist(this.playlist.id);

    const songs$: Observable<Song[]> = playlist$.pipe(
        flatMap(playlist => playlist === undefined ? of([]) : this.ads.getSongsByIds(playlist.songIds)),
        map(songs => songs.filter(defined) as Song[]),
    );
    const artists$: Observable<(Artist|undefined)[]> = songs$.pipe(
        flatMap(songs => this.ads.getArtistsByIds(songs.map(s => s.artistId)))
    );

    combineLatest([playlist$, songs$, artists$]).pipe(
        takeUntil(this.destroyed$),
        throttleTime(100, undefined, {leading: true, trailing: true}),
    ).subscribe(([playlist, songs, artists]) => {
      if (playlist === undefined) {
        this.songItems = []; //todo: redirect?
        return;
      }
      this.playlist = playlist;
      this.songItems = [];
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const artist = artists[i];
        if (artist) {
          this.songItems.push({
            song,
            artist,
            artistName: getNameFirstFormArtistName(artist),
            last: i === songs.length - 1,
          });
        }
      }
      this.updateMeta();
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    //todo: add user info?
    updatePageMetadata(this.title, this.meta, {
      title: `${this.playlist.name} - плейлист`,
      description: `Плейлист ${this.playlist.name}`,
      keywords: ['плейлист', 'аккорды', 'гитара'],
    });
  }
}

interface PlaylistPageInput {
  playlist: Playlist;
}

@Injectable({providedIn: 'root'})
export class PlaylistPageResolver implements Resolve<PlaylistPageInput> {

  constructor(private readonly uds: UserDataService,
              private readonly router: Router,
  ) {
  }

  async resolve(route: ActivatedRouteSnapshot): Promise<PlaylistPageInput> {
    const mount = route.paramMap.get('playlistMount')!;
    const playlist = await this.uds.getPlaylist(mount).pipe(take(1)).toPromise();
    if (playlist) {
      return {playlist};
    }
    this.router.navigate([MOUNT_PAGE_NOT_FOUND]).catch(err => console.error(err));
    return {playlist: {} as Playlist}; //todo: find a better pattern
  }
}
