import { Injectable } from '@nestjs/common';
import {
  FullTextSongSearchResult,
  MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS,
  MAX_FULL_TEXT_SEARCH_TITLE_RESULTS,
} from '@common/api-model';
import { MIN_LEN_FOR_FULL_TEXT_SEARCH } from '@common/common-constants';
import { toSafeSearchText } from '@common/util/misc-utils';
import { SERVER_CONFIG } from '../backend-config';

const SPHINX_SQL_URL = 'http://localhost:9307/sql';

@Injectable()
export class FullTextSearchDbi {
  async searchForSongsByText(
    text: string,
    maxTitleResults = MAX_FULL_TEXT_SEARCH_TITLE_RESULTS,
    maxContentResults = MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS,
  ): Promise<FullTextSongSearchResult[]> {
    const safeSearchText = toSafeSearchText(text);
    if (safeSearchText.length < MIN_LEN_FOR_FULL_TEXT_SEARCH) {
      return [];
    }
    // Using 'default' mode unless quoted.
    const exact = isQuoted(text.trim());
    const titleQuery = buildSphinxQuery('title', safeSearchText, maxTitleResults, exact ? 'exact' : 'default');
    const contentQuery = buildSphinxQuery(
      'content',
      safeSearchText,
      MAX_FULL_TEXT_SEARCH_CONTENT_RESULTS,
      exact ? 'exact' : 'default',
    );
    // 'Default' vs 'infix':
    //  'default' can search different word-forms, but can't search by prefix/infix/suffix
    //  'infix' does not know about word-forms, but can search by prefix/infix/suffix.
    // We use 'infix' results only if there are not enough 'default' results.
    const infixTitleQuery = exact ? '' : buildSphinxQuery('title', safeSearchText, maxTitleResults, 'infix');
    const infixContentQuery = exact ? '' : buildSphinxQuery('content', safeSearchText, maxContentResults, 'infix');
    const queries = [this.query(titleQuery), this.query(contentQuery), this.query(infixTitleQuery), this.query(infixContentQuery)];
    const [titleResults, contentResults, infixTitleResults, infixContentResults]: SphinxSearchResult[] = await Promise.all(queries);
    const titles: FullTextSongSearchResult[] = [];
    const contents: FullTextSongSearchResult[] = [];
    const titleSongIds = new Set<number>();
    const contentSongIds = new Set<number>();
    for (const match of titleResults.matches) {
      const result = createFullTextResultFromMatch(match, 'title');
      titles.push(result);
      titleSongIds.add(result.songId);
    }
    for (const match of contentResults.matches) {
      const result = createFullTextResultFromMatch(match, 'content');
      contents.push(result);
      contentSongIds.add(result.songId);
    }
    for (let i = 0; i < infixTitleResults.matches.length && titles.length < maxTitleResults; i++) {
      const result = createFullTextResultFromMatch(infixTitleResults.matches[i], 'title');
      if (!titleSongIds.has(result.songId)) {
        titles.push(result);
      }
    }
    for (let i = 0; i < infixContentResults.matches.length && contents.length < maxContentResults; i++) {
      const result = createFullTextResultFromMatch(infixContentResults.matches[i], 'content');
      if (!contentSongIds.has(result.songId)) {
        contents.push(result);
      }
    }
    return [...titles, ...contents];
  }

  private async query(query: string): Promise<SphinxSearchResult> {
    if (query.length == 0) {
      return { matches: [] };
    }
    const encodedQuery = encodeURIComponent(query);
    try {
      const response = await fetch(SPHINX_SQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `query=${encodedQuery}`,
      });
      if (!response.ok) {
        console.error('Error', response);
        return { matches: [] };
      }
      return (await response.json()) as SphinxSearchResult;
    } catch (e) {
      console.error('Error querying sphinx', e);
      return { matches: [] };
    }
  }
}

interface SphinxSearchResult {
  /** Attribute names. Not used.*/
  readonly attrs?: string[];
  /** Array of matches. Every match is an array of values mentioned in attribute names. */
  readonly matches: SphinxMatch[];
  /** More metrics. Not used. */
  readonly meta?: unknown;
}

type SphinxMatch = [number, string, string, string, string, string]; // id, snippet, song title, collection name, collection mount, song mount

const SONG_INDEX = SERVER_CONFIG.sphinxSongIndex;

export type MatchMode = 'default' | 'exact' | 'infix';

function buildSphinxQuery(fieldName: string, text: string, maxResults: number, matchMode: MatchMode): string {
  let query = text;
  let snippetQuery = text;
  switch (matchMode) {
    case 'exact':
      query = `"${text}"`;
      break;
    case 'infix':
      query = snippetQuery = `*${text}*`;
      break;
  }
  // Snippet params: http://sphinxsearch.com/docs/current/api-func-buildexcerpts.html
  const snippet = `SNIPPET(${fieldName}, '${snippetQuery}', 'limit=200, around=10, exact_phrase=${matchMode === 'exact'}')`;
  const match = `MATCH('@${fieldName} ${query}')`;
  return `SELECT id, ${snippet}, title, collection_name, collection_mount, song_mount FROM ${SONG_INDEX} WHERE ${match} LIMIT ${maxResults}`;
}

/** Converts match returned by sphinx engine to FullTextSongSearchResult structure. */
function createFullTextResultFromMatch(
  match: [number, string, string, string, string, string],
  matchType: 'title' | 'content',
): FullTextSongSearchResult {
  return {
    songId: match[0],
    snippet: match[1],
    songTitle: match[2],
    collectionName: match[3],
    collectionMount: match[4],
    songMount: match[5],
    matchType,
  };
}

/** Returns true if the text is quoted. Both single or double quote characters are checked. */
function isQuoted(text: string): boolean {
  return text.length > 1 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")));
}
