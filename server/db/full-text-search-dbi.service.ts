import {HttpService, Injectable, Logger} from '@nestjs/common';
import {FullTextSongSearchResult, FullTextSongSearchResultMatchType, MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS, MAX_FULL_TEXT_SEARCH_TITLE_RESULTS} from '@common/ajax-model';
import {take} from 'rxjs/operators';
import {AxiosResponse} from 'axios';
import {MIN_LEN_FOR_FULL_TEXT_SEARCH} from '@common/common-constants';
import {toSafeSearchText} from '@common/util/misc-utils';

const SPHINX_SQL_URL = 'http://localhost:9307/sql';

@Injectable()
export class FullTextSearchDbi {

  private readonly logger = new Logger(FullTextSearchDbi.name);

  constructor(private readonly nestHttpService: HttpService) {
  }

  async searchForSongsByText(text: string): Promise<FullTextSongSearchResult[]> {
    const safeSearchText = toSafeSearchText(text);
    if (safeSearchText.length < MIN_LEN_FOR_FULL_TEXT_SEARCH) {
      return [];
    }
    const titleQuery = buildSphinxQuery('title', safeSearchText, MAX_FULL_TEXT_SEARCH_TITLE_RESULTS);
    const contentQuery = buildSphinxQuery('content', safeSearchText, MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS);
    const [titleResults, contentResults]: SphinxSearchResult[] = await Promise.all([this.query(titleQuery), this.query(contentQuery)]);
    const result = [];
    addResults(titleResults.matches, result, 'title');
    addResults(contentResults.matches, result, 'content');
    return result;
  }

  private async query(query: string): Promise<SphinxSearchResult> {
    const encodedQuery = encodeURIComponent(query);
    const params = `query=${encodedQuery}`;
    try {
      const axiosResponse: AxiosResponse<SphinxSearchResult> = await this.nestHttpService.post<SphinxSearchResult>(SPHINX_SQL_URL, params)
          .pipe(take(1))
          .toPromise();
      return axiosResponse.data;
    } catch (e) {
      this.logger.error(`Error querying sphinx: ${e}`);
      return {matches: []};
    }

  }
}

interface SphinxSearchResult {
  /** Attribute names. Not used.*/
  readonly attrs?: string[];
  /** Array of matches. Every match is array of values mentioned in attribute names. */
  readonly matches: SphinxMatch[];
  /** More metrics. Not used. */
  readonly meta?: any;
}

type SphinxMatch = [number, string, string, string, string, string]; // id, snippet, song title, collection name, collection mount, song mount

function buildSphinxQuery(fieldName: string, text: string, maxResults: number): string {
  return `SELECT id, SNIPPET(${fieldName}, '${text}'), title, collection_name, collection_mount, song_mount FROM song_index WHERE MATCH('@${fieldName} ${text}') LIMIT ${maxResults}`;
}

function addResults(sphinxMatches: SphinxMatch[], result: FullTextSongSearchResult[], matchType: FullTextSongSearchResultMatchType): void {
  for (const match of sphinxMatches) {
    result.push({
      songId: match[0],
      snippet: match[1],
      songTitle: match[2],
      collectionName: match[3],
      collectionMount: match[4],
      songMount: match[5],
      matchType,
    });
  }
}

