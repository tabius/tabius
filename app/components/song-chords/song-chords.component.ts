import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ChordLayout, getChordLayout} from '@app/utils/chords-layout-lib';
import {ChordRenderingOptions, renderChord} from '@app/utils/chords-renderer';
import {UserDataService} from '@app/services/user-data.service';
import {takeUntil} from 'rxjs/operators';
import {SongDetails} from '@common/artist-model';
import {Subject} from 'rxjs';
import {parseChords} from '@app/utils/chords-parser';

@Component({
  selector: 'gt-song-chords',
  templateUrl: './song-chords.component.html',
  styleUrls: ['./song-chords.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongChordsComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new Subject<void>();

  //TODO: handle song change.
  @Input() song!: SongDetails;

  chords: ChordLayout[] = [];

  private transpose = 0;
  private b4Si?: boolean;

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly uds: UserDataService) {
  }

  ngOnInit(): void {
    this.uds.getUserSongSettings(this.song.id)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(songSettings => {
          this.transpose = songSettings.transpose;
          this.updateChordsList();
          this.cd.detectChanges();
        });

    this.uds.getB4SiFlag()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(b4Si => {
          this.b4Si = b4Si;
          this.updateChordsList();
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  private updateChordsList() {
    const chordLocations = parseChords(this.song.content);
    const options: ChordRenderingOptions = {useH: !this.b4Si, transpose: this.transpose};
    const orderedChordNames: string[] = [];
    const chordsSet = new Set<string>();
    for (const location of chordLocations) {
      const chordName = renderChord(location.chord, options);
      if (!chordsSet.has(chordName)) {
        chordsSet.add(chordName);
        orderedChordNames.push(chordName);
      }
    }
    this.chords = orderedChordNames
        .map(name => getChordLayout(name))
        .filter(layout => layout !== undefined) as ChordLayout[];
  }

}

