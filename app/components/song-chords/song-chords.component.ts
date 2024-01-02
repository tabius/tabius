import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChordLayout, getChordLayout } from '@app/utils/chords-layout-lib';
import { ChordRenderingOptions, getToneWithH4SiFix, renderChord, TONES_COUNT } from '@app/utils/chords-renderer';
import { UserService } from '@app/services/user.service';
import { switchMap } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { parseChord, parseChords } from '@app/utils/chords-parser';
import { isDefined } from '@common/util/misc-utils';
import { CatalogService } from '@app/services/catalog.service';
import { getDefaultH4SiFlag, newDefaultUserSongSettings, UserSongSettings } from '@common/user-model';
import { ChordClickInfo } from '@app/directives/show-chord-popover-on-click.directive';
import { I18N } from '@app/app-i18n';
import { Chord, ChordTone } from '@app/utils/chords-lib';
import { getSongKey, getTransposeDistance, transposeAsMinor } from '@app/utils/key-detector';
import { SongDetails } from '@common/catalog-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';

@Component({
  selector: 'gt-song-chords',
  templateUrl: './song-chords.component.html',
  styleUrls: ['./song-chords.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongChordsComponent extends AbstractAppComponent {
  @Input({ required: true }) songId!: number;
  @Input() showControls = false;

  readonly i18n = I18N.songChordsComponent;

  chordLayouts: ChordLayout[] = [];

  private songDetails?: SongDetails;
  private songSettings = newDefaultUserSongSettings(0);
  h4Si = getDefaultH4SiFlag();
  private content = '';

  popoverChordLayout?: ChordLayout;

  favoriteKey?: ChordTone;
  originalSongKey?: ChordTone;
  transposeActionKey?: ChordTone;

  constructor(private readonly uds: UserService,
              private readonly cds: CatalogService,
  ) {
    super();

    this.changes$.pipe(
      switchMap(() => {
        const songDetails$ = this.cds.getSongDetailsById(this.songId);
        const songSettings$ = this.uds.getUserSongSettings(this.songId);
        const h4Si$ = this.uds.getH4SiFlag();
        const favoriteKey$ = this.uds.getFavoriteKey();
        const details$ = this.cds.getSongDetailsById(this.songId);
        return combineLatest([songDetails$, songSettings$, h4Si$, favoriteKey$, details$]);
      }),
      takeUntilDestroyed(),
    ).subscribe(([songDetails, songSettings, h4Si, favoriteKey, details]) => {
      this.songSettings = songSettings;
      this.h4Si = h4Si;
      this.favoriteKey = favoriteKey;
      this.content = details ? details.content : '';
      this.songDetails = songDetails;

      this.originalSongKey = getSongKey(this.songDetails);
      this.transposeActionKey = getTransposeActionKey(this.originalSongKey, favoriteKey, songSettings.transpose);

      this.updateChordList();
      this.cdr.markForCheck();
    });
  }

  getChordInfo(event: MouseEvent, chord: Chord|undefined): ChordClickInfo {
    return { element: event.target as HTMLElement, chord: chord! };
  }

  private updateChordList(): void {
    const chordLocations = parseChords(this.content);
    const options: ChordRenderingOptions = { useH: this.h4Si, transpose: this.songSettings.transpose };
    const orderedChordNames: string[] = [];
    const chordSet = new Set<string>();
    for (const location of chordLocations) {
      const chordName = renderChord(location.chord, options);
      if (!chordSet.has(chordName)) {
        chordSet.add(chordName);
        orderedChordNames.push(chordName);
      }
    }
    this.chordLayouts = orderedChordNames
      .map(name => parseChord(name))
      .filter(isDefined)
      .map(({ chord }) => getChordLayout(chord))
      .filter(isDefined) as ChordLayout[];
  }

  onTransposeClicked(steps: number): void {
    const transpose = steps === 0 ? 0 : (this.songSettings!.transpose + steps) % TONES_COUNT;
    this.uds.setUserSongSettings({ ...this.songSettings!, transpose }).then();
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
    uds.setUserSongSettings({ ...songSettings!, transpose }).then();
  }
}

export function getTransposeActionKey(originalKey: ChordTone|undefined, favoriteKey: ChordTone, currentTranspose: number): ChordTone|undefined {
  if (originalKey === undefined) {
    return undefined;
  }
  const onScreenSongKey = originalKey ? transposeAsMinor(originalKey, currentTranspose) : undefined;
  return onScreenSongKey !== favoriteKey ? favoriteKey : onScreenSongKey === 'A' ? 'E' : 'A';
}
