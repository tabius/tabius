import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Artist} from '@common/artist-model';
import {ArtistDataService} from '@app/services/artist-data.service';
import {FormControl} from '@angular/forms';
import {debounce, takeUntil, throttleTime} from 'rxjs/operators';
import {BehaviorSubject, Subject, timer} from 'rxjs';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {getArtistPageLink} from '@common/util/misc-utils';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';

interface LetterBlock {
  letter: string,
  artists: ArtistItem[]
}

interface ArtistItem extends Artist {
  lcName: string;
}

/**
 * Using global variable to keep it for the page between navigations.
 * Unsafe if there are multiple ArtistListPageComponent, but safe it there is only 1.
 */
let letterBlockFilters: string[] = [];

@Component({
  selector: 'gt-artist-list-page',
  templateUrl: './artist-list-page.component.html',
  styleUrls: ['./artist-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistListPageComponent implements OnInit {
  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);
  readonly getArtistPageLink = getArtistPageLink;

  loaded = false;
  letterBlocks: LetterBlock[] = [];
  searchValue: string = '';
  artistFilterControl = new FormControl();

  filteredArtists:Artist[] = [];

  constructor(private readonly ads: ArtistDataService,
              readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.artistFilterControl.valueChanges
        .pipe(
            debounce(() => timer(300)),
            takeUntil(this.destroyed$)
        )
        .subscribe(newValue => this.updateArtistFilter(newValue));

    this.ads.getArtistList()
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(artists => {
          this.letterBlocks = toLetterBlocks(artists);
          this.loaded = true;
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();
        });
    this.updateMeta();
  }

  updateMeta() {
    updatePageMetadata(this.title, this.meta, {
      title: 'Список артистов',
      description: 'Список всех исполнителей для которых на Tabius есть подборы аккордов.',
      keywords: ['табы', 'аккорды', 'гитара', 'список артистов'],
    });
  }

  trackByLetter(idx: number, block: LetterBlock): string {
    return block.letter;
  }

  trackByArtistId(idx: number, artist: Artist): number {
    return artist.id;
  }

  activateLetter(letter: string|null) {
    this.updateArtistFilter('');
    if (letter == null) {
      letterBlockFilters = [];
    } else {
      letterBlockFilters = [letter];
    }
  }

  getVisibleLetterBlocks(): LetterBlock[] {
    if (letterBlockFilters.length === 0) {
      return this.letterBlocks;
    }
    return this.letterBlocks.filter(block => letterBlockFilters.some(letter => block.letter === letter));
  }

  isLetterSelected(letter: string): boolean {
    return letterBlockFilters.some(l => l === letter);
  }

  updateArtistFilter(value: string) {
    if (this.searchValue != value) {
      this.searchValue = value;
      this.filteredArtists = this.getFilteredArtists();
      this.cd.markForCheck();
    }
  }

  private getFilteredArtists(): Artist[] {
    const result: Artist[] = [];
    const filterLc = this.searchValue.toLocaleLowerCase();
    for (const letterBlock of this.letterBlocks) {
      letterBlock.artists.filter(a => a.lcName.includes(filterLc)).forEach(a => result.push(a));
    }
    return result;
  }
}

function toLetterBlocks(artists: readonly Artist[]): LetterBlock[] {
  const blocksByLetter = new Map<string, LetterBlock>();
  for (const artist of artists) {
    let letter = artist.name.charAt(0);
    if ('0123456789'.includes(letter)) {
      letter = '0-9';
    } else if (letter > 'A' && letter < 'z') {
      letter = 'A-Z';
    }
    const letterBlock = blocksByLetter.get(letter) || {letter, artists: []};
    letterBlock.artists.push({...artist, lcName: artist.name.toLocaleLowerCase()});
    blocksByLetter.set(letter, letterBlock);
  }
  blocksByLetter.forEach(block => block.artists.sort((a1, a2) => a1.name.localeCompare(a2.name)));
  return Array.from(blocksByLetter.values()).sort((b1, b2) => b1.letter.localeCompare(b2.letter));
}
