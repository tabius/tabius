import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {combineLatest, of, Subject} from 'rxjs';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {combineLatest0, defined, getSongPageLink} from '@common/util/misc-utils';
import {sortSongsAlphabetically} from '@app/components/artist-page/artist-page.component';

@Component({
  selector: 'gt-song-prev-next-navigator',
  templateUrl: './song-prev-next-navigator.component.html',
  styleUrls: ['./song-prev-next-navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrevNextNavigatorComponent implements OnInit, OnDestroy {

  private readonly destroyed$ = new Subject();

  @Input() songId!: number;

  prevLink?: string;
  nextLink?: string;

  constructor(private readonly ads: ArtistDataService,
              protected readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    const song$ = this.ads.getSongById(this.songId);
    const artist$ = song$.pipe(flatMap(song => song ? this.ads.getArtistById(song.artistId) : of(undefined)));
    // list of all artist songs sorted by id.
    const allSongs$ = artist$.pipe(
        flatMap(artist => artist ? this.ads.getArtistSongList(artist.id) : of([])),
        flatMap(songIds => combineLatest0((songIds || []).map(id => this.ads.getSongById(id)))),
        map(songs => sortSongsAlphabetically(songs.filter(defined)).map(song => song.id)),
    );
    combineLatest([artist$, allSongs$])
        .pipe(
            takeUntil(this.destroyed$),
            flatMap(([artist, allSongs]) => {
              if (!artist || !allSongs || allSongs.length === 0) {
                return of([undefined, undefined, undefined]);
              }
              const songIdx = allSongs.indexOf(this.songId);
              const nextSongIdx = (songIdx + 1) % allSongs.length;
              const prevSongIdx = (songIdx + allSongs.length - 1) % allSongs.length;
              const nextSongId = allSongs[nextSongIdx];
              const prevSongId = allSongs[prevSongIdx];
              return combineLatest([of(artist.mount), this.ads.getSongById(prevSongId), this.ads.getSongById(nextSongId)]);
            })
        )
        .subscribe(([artistMount, prevSong, nextSong]) => {
          if (!artistMount || !prevSong || !nextSong) {
            return;
          }
          this.prevLink = getSongPageLink(artistMount, prevSong.mount);
          this.nextLink = getSongPageLink(artistMount, nextSong.mount);
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

}