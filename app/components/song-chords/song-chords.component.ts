import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ChordLayout, getChordLayout} from '@app/utils/chords-layout-lib';
import {ChordRenderingOptions, getToneWithH4SiFix, renderChord, TONES_COUNT} from '@app/utils/chords-renderer';
import {UserService} from '@app/services/user.service';
import {switchMap, takeUntil} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, ReplaySubject, Subject} from 'rxjs';
import {parseChord, parseChords} from '@app/utils/chords-parser';
import {defined} from '@common/util/misc-utils';
import {CatalogService} from '@app/services/catalog.service';
import {DEFAULT_FAVORITE_KEY, newDefaultUserSongSettings} from '@common/user-model';
import {ChordClickInfo} from '@app/directives/show-chord-popover-on-click.directive';
import {I18N} from '@app/app-i18n';
import {Chord, ChordTone} from '@app/utils/chords-lib';
import {detectKeyAsMinor, getTransposeDistance, transposeAsMinor} from '@app/utils/key-detector';
import {SongDetails} from '@common/catalog-model';

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

  private songDetails?: SongDetails;
  private songSettings = newDefaultUserSongSettings(0);
  h4Si = false;
  private content = '';

  private readonly songId$ = new ReplaySubject<number>(1);

  popoverChordLayout?: ChordLayout;

  transposeActionKey = DEFAULT_FAVORITE_KEY;
  favoriteKey?: ChordTone;
  readonly transposeActionText$ = new BehaviorSubject<string>(`${this.transposeActionKey}m`);

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly uds: UserService,
              private readonly cds: CatalogService,
  ) {
  }

  ngOnInit(): void {
    const songDetails$ = this.songId$.pipe(switchMap(songId => this.cds.getSongDetailsById(songId)));
    const songSettings$ = this.songId$.pipe(switchMap(songId => this.uds.getUserSongSettings(songId)));
    const h4Si$ = this.uds.getH4SiFlag();
    const favoriteKey$ = this.uds.getFavoriteKey();
    const details$ = this.songId$.pipe(switchMap(songId => this.cds.getSongDetailsById(songId)));

    combineLatest([songDetails$, songSettings$, h4Si$, favoriteKey$, details$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([songDetails, songSettings, h4Si, favoriteKey, details]) => {
          this.songSettings = songSettings;
          this.h4Si = h4Si;
          this.favoriteKey = favoriteKey;
          this.content = details ? details.content : '';
          this.songDetails = songDetails;

          const onScreenSongKey = getOnScreenSongKey(songDetails, songSettings);
          this.transposeActionKey = onScreenSongKey === favoriteKey ? (onScreenSongKey === 'A' ? 'E' : 'A') : favoriteKey;
          this.transposeActionText$.next(`${getToneWithH4SiFix(this.h4Si, this.transposeActionKey)}m`);

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

  transposeToFavoriteKeyClicked(): void {
    const originalSongKey = getOnScreenSongKey(this.songDetails, {transpose: 0});
    if (originalSongKey) {
      const transposeDistance = getTransposeDistance(originalSongKey, this.transposeActionKey);
      const transpose = (transposeDistance + TONES_COUNT) % TONES_COUNT;
      this.uds.setUserSongSettings({...this.songSettings!, transpose});
    }
  }

  getFavoriteKeyTitle(): string {
    return this.transposeActionKey === this.favoriteKey ? this.i18n.favoriteKey : this.i18n.simpleKey;
  }
}

export function getOnScreenSongKey(songDetails: ({ content: string })|undefined, userSongSettings: ({ transpose: number })|undefined): ChordTone|undefined {
  if (!songDetails || !userSongSettings) {
    return undefined;
  }
  const chords = parseChords(songDetails.content).map(l => l.chord);
  chords.splice(Math.min(chords.length, 12));
  const originalSongKey = detectKeyAsMinor(chords);
  return originalSongKey ? transposeAsMinor(originalSongKey, userSongSettings.transpose) : undefined;
}
