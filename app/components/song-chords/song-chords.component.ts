import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ChordLayout, getChordLayout} from '@app/utils/chords-layout-lib';
import {ChordRenderingOptions, getToneWithH4SiFix, renderChord, TONES_COUNT} from '@app/utils/chords-renderer';
import {UserService} from '@app/services/user.service';
import {switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, ReplaySubject, Subject} from 'rxjs';
import {parseChord, parseChords} from '@app/utils/chords-parser';
import {defined} from '@common/util/misc-utils';
import {CatalogService} from '@app/services/catalog.service';
import {getDefaultH4SiFlag, newDefaultUserSongSettings, UserSongSettings} from '@common/user-model';
import {ChordClickInfo} from '@app/directives/show-chord-popover-on-click.directive';
import {I18N} from '@app/app-i18n';
import {Chord, ChordTone} from '@app/utils/chords-lib';
import {getSongKey, getTransposeDistance, transposeAsMinor} from '@app/utils/key-detector';
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
  h4Si = getDefaultH4SiFlag();
  private content = '';

  private readonly songId$ = new ReplaySubject<number>(1);

  popoverChordLayout?: ChordLayout;

  favoriteKey?: ChordTone;
  originalSongKey?: ChordTone;
  transposeActionKey?: ChordTone;

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

          this.originalSongKey = getSongKey(this.songDetails);
          this.transposeActionKey = getTransposeActionKey(this.originalSongKey, favoriteKey, songSettings.transpose);

          this.updateChordsList();
          this.cd.detectChanges();
        });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.songId$.next(this.songId);
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
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
    updateUserSongSetting(this.originalSongKey, this.transposeActionKey, this.songSettings, this.uds);
  }

  getTransposeKeyTitle(): string {
    return this.transposeActionKey === this.favoriteKey ? this.i18n.favoriteKey : this.i18n.simpleKey;
  }

  getTransposeKeyAsMinor(): string {
    return this.transposeActionKey ? `${getToneWithH4SiFix(this.h4Si, this.transposeActionKey)}m` : '?';
  }
}

export function updateUserSongSetting(originalSongKey: ChordTone|undefined,
                                      transposeActionKey: ChordTone|undefined,
                                      songSettings: UserSongSettings|undefined,
                                      uds: UserService): void {
  if (originalSongKey && transposeActionKey && songSettings) {
    const transposeDistance = getTransposeDistance(originalSongKey, transposeActionKey);
    const transpose = (transposeDistance + TONES_COUNT) % TONES_COUNT;
    uds.setUserSongSettings({...songSettings!, transpose});
  }
}

export function getTransposeActionKey(originalKey: ChordTone|undefined, favoriteKey: ChordTone, currentTranspose: number): ChordTone|undefined {
  if (originalKey === undefined) {
    return undefined;
  }
  const onScreenSongKey = originalKey ? transposeAsMinor(originalKey, currentTranspose) : undefined;
  return onScreenSongKey !== favoriteKey ? favoriteKey : onScreenSongKey === 'A' ? 'E' : 'A';
}
