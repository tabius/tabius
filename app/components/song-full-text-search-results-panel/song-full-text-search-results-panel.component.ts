import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {FullTextSongSearchRequest, FullTextSongSearchResponse, FullTextSongSearchResult} from '@common/ajax-model';
import {getSongPageLink} from '@common/util/misc-utils';
import {getSongTextWithNoChords} from '@app/components/song-page/song-page.component';

@Component({
  selector: 'gt-song-full-text-search-results-panel',
  templateUrl: './song-full-text-search-results-panel.component.html',
  styleUrls: ['./song-full-text-search-results-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongFullTextSearchResultsPanelComponent implements OnChanges {

  @Input() searchText!: string;

  titleResults: FullTextSongSearchResult[] = [];
  contentResults: FullTextSongSearchResult[] = [];
  loading = false;

  constructor(
      private readonly httpClient: HttpClient,
      private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.titleResults = [];
    this.contentResults = [];
    if (this.searchText.length > 3) {
      const fullTextSearchRequest: FullTextSongSearchRequest = {text: this.searchText};
      this.loading = true;
      //todo: handle concurrent requests
      this.httpClient.post<FullTextSongSearchResponse>('/api/song/by-text', fullTextSearchRequest)
          .subscribe(response => {
            for (const result of response.results) {
              if (result.matchType === 'title') {
                this.titleResults.push(result);
              } else {
                this.contentResults.push(result);
              }
            }
            this.titleResults.sort((r1, r2) => r1.songTitle.localeCompare(r2.songTitle));
            //todo: sort by score?
            this.contentResults.sort((r1, r2) => r1.songTitle.localeCompare(r2.songTitle));
            this.loading = false;
            this.cd.detectChanges();
          });
    }
  }

  getSongLink(searchResult: FullTextSongSearchResult): string {
    return getSongPageLink(searchResult.artistMount, searchResult.songMount);
  }

  formatResultSnippet(snippet: string): string {
    return getSongTextWithNoChords(snippet, 5);
  }
}

