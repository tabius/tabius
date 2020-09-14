import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ChordLayout, getChordLayout} from '@app/utils/chords-layout-lib';
import {ChordRenderingOptions, renderChord, TONES_COUNT} from '@app/utils/chords-renderer';
import {UserService} from '@app/services/user.service';
import {switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, ReplaySubject, Subject} from 'rxjs';
import {parseChord, parseChords} from '@app/utils/chords-parser';
import {defined} from '@common/util/misc-utils';
import {CatalogService} from '@app/services/catalog.service';
import {newDefaultUserSongSettings} from '@common/user-model';
import {ChordClickInfo} from '@app/directives/show-chord-popover-on-click.directive';
import {I18N} from '@app/app-i18n';
import {Chord} from '@app/utils/chords-lib';

@Component({
  selector: 'gt-song-chords',
  templateUrl: './song-chords.component.html',
  styleUrls: ['./song-chords.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongChordsComponent implements OnChanges, OnInit, OnDestroy {
  @Input() songId!: number;
  @Input() showControls = false;

  readonly i18n = I18N.songChordsComponent;

  private readonly destroyed$ = new Subject();

  chordLayouts: ChordLayout[] = [];

  private songSettings = newDefaultUserSongSettings(0);
  h4Si = false;
  private content = '';

  private readonly songId$ = new ReplaySubject<number>(1);

  popoverChordLayout?: ChordLayout;

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
          this.songSettings = songSettings;
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

  getChordInfo(event: MouseEvent, chord: Chord|undefined): ChordClickInfo {
    return {element: event.target as HTMLElement, chord: chord!};
  }


  private updateChordsList() {
    const chordLocations = parseChords(this.content);
    const options: ChordRenderingOptions = {useH: this.h4Si, transpose: this.songSettings.transpose};
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

  onTransposeClicked(steps: number): void {
    const transpose = steps === 0 ? 0 : (this.songSettings!.transpose + steps) % TONES_COUNT;
    this.uds.setUserSongSettings({...this.songSettings!, transpose});
  }
}
