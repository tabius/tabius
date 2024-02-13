import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FullTextSongSearchRequest,
  FullTextSongSearchResponse,
  FullTextSongSearchResult,
  MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS,
  MAX_FULL_TEXT_SEARCH_TITLE_RESULTS,
} from '@common/api-model';
import { getSongPageLink, toSafeSearchText } from '@common/util/misc-utils';
import { getSongTextWithNoChords } from '@app/components/song-page/song-page.component';
import { MIN_LEN_FOR_FULL_TEXT_SEARCH } from '@common/common-constants';
import { I18N } from '@app/app-i18n';

// TODO unify listing styles with other components.

@Component({
  selector: 'gt-song-full-text-search-results-panel',
  templateUrl: './song-full-text-search-results-panel.component.html',
  styleUrls: ['./song-full-text-search-results-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongFullTextSearchResultsPanelComponent implements OnChanges {
  @Input({ required: true }) searchText!: string;

  readonly i18n = I18N.fullTextSearchResultsComponent;
  readonly maxTitleResults = MAX_FULL_TEXT_SEARCH_TITLE_RESULTS;
  readonly maxContentResults = MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS;

  titleResults: FullTextSongSearchResult[] = [];
  contentResults: FullTextSongSearchResult[] = [];
  loading = false;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly cd: ChangeDetectorRef,
  ) {}

  ngOnChanges(): void {
    this.clearResults();
    if (this.searchText.length >= MIN_LEN_FOR_FULL_TEXT_SEARCH && toSafeSearchText(this.searchText).length > 0) {
      const fullTextSearchRequest: FullTextSongSearchRequest = { text: this.searchText };
      this.loading = true;
      //todo: handle concurrent requests
      this.httpClient.post<FullTextSongSearchResponse>('/api/song/by-text', fullTextSearchRequest).subscribe(response => {
        this.clearResults();
        for (const result of response.results) {
          if (result.matchType === 'title') {
            this.titleResults.push(result);
          } else {
            this.contentResults.push(result);
          }
        }
        this.loading = false;
        this.cd.markForCheck();
      });
    }
  }

  private clearResults(): void {
    this.titleResults = [];
    this.contentResults = [];
  }

  getSongLink(searchResult: FullTextSongSearchResult): string {
    return getSongPageLink(searchResult.collectionMount, searchResult.songMount);
  }

  formatResultSnippet(snippet: string): string {
    const multilineSnippet = snippet.replace(/\.\.\./g, '\n');
    const lines = getSongTextWithNoChords(multilineSnippet, 10, false)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 1) {
      return lines[0].trim();
    }
    const linesSet = new Set<string>();
    const uniqueLines: string[] = [];
    for (const line of lines) {
      if (line.length >= MIN_LEN_FOR_FULL_TEXT_SEARCH && !linesSet.has(line)) {
        uniqueLines.push(line);
        linesSet.add(line);
      }
    }
    return uniqueLines.join('\n');
  }
}
