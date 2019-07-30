import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {FullTextSongSearchRequest, FullTextSongSearchResponse, FullTextSongSearchResult} from '@common/ajax-model';

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
          .subscribe(res => {
            this.loading = false;
            for (const result of res.results) {
              if (result.resultIsTitle) {
                this.titleResults.push(result);
              } else {
                this.contentResults.push(result);
              }
            }
            this.cd.detectChanges();
          });
    }
  }
}

