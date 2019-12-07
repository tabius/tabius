import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ChordLayout, getChordLayout} from '@app/utils/chords-layout-lib';
import {ChordRenderingOptions, renderChord} from '@app/utils/chords-renderer';
import {UserService} from '@app/services/user.service';
import {switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, ReplaySubject, Subject} from 'rxjs';
import {parseChord, parseChords} from '@app/utils/chords-parser';
import {defined} from '@common/util/misc-utils';
import {CatalogService} from '@app/services/catalog.service';

@Component({
  selector: 'gt-song-chords',
  templateUrl: './song-chords.component.html',
  styleUrls: ['./song-chords.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongChordsComponent implements OnChanges, OnInit, OnDestroy {
  private readonly destroyed$ = new Subject();

  @Input() songId!: number;

  chordLayouts: ChordLayout[] = [];

  private transpose = 0;
  private h4Si = false;
  private content = '';

  private readonly songId$ = new ReplaySubject<number>(1);

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly uds: UserService,
              private readonly cds: CatalogService,
  ) {
  }

  ngOnInit(): void {
    const songSettings$ = this.songId$.pipe(switchMap(songId => this.uds.getUserSongSettings(songId)));
    const h4Si$ = this.uds.getH4SiFlag();
    const details$ = this.songId$.pipe(switchMap(songId => this.cds.getSongDetailsById(songId)));

    combineLatest([songSettings$, h4Si$, details$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([songSettings, h4Si, details]) => {
          this.transpose = songSettings.transpose;
          this.h4Si = h4Si;
          this.content = details ? details.content : '';
          this.updateChordsList();
          this.cd.detectChanges();
        });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.songId$.next(this.songId);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  private updateChordsList() {
    const chordLocations = parseChords(this.content);
    const options: ChordRenderingOptions = {useH: this.h4Si, transpose: this.transpose};
    const orderedChordNames: string[] = [];
    const chordsSet = new Set<string>();
    for (const location of chordLocations) {
      const chordName = renderChord(location.chord, options);
      if (!chordsSet.has(chordName)) {
        chordsSet.add(chordName);
        orderedChordNames.push(chordName);
      }
    }
    this.chordLayouts = orderedChordNames
        .map(name => parseChord(name))
        .filter(defined)
        .map(({chord}) => getChordLayout(chord))
        .filter(defined) as ChordLayout[];
  }
}
