/**
 * Phase 1 of broken-YouTube-link repair: search YouTube for a replacement of each broken video and
 * fill the `youtube_link_fix` review queue. This script NEVER edits song media_links — a moderator
 * approves a candidate later via the admin UI (phase 2/3). Here we only populate candidates.
 *
 * For every (song, broken video id) — where "broken" comes from the youtube_video_status cache —
 * we query the YouTube Data API with `<artist> <song title>`, verify each candidate is embeddable,
 * score it (title similarity x channel trust), and upsert the row. Items already approved/dismissed
 * are skipped; everything else is re-searched only after a cool-down so we don't waste API quota.
 *
 * Requires `youtubeApiKey` in server-config.json. The Data API search.list call costs 100 quota
 * units (default daily quota 10000 => ~100 searches/day), so the run is capped by --max-searches.
 *
 * Usage:
 *   npm run find-youtube-replacements                  # search due items, then print the queue
 *   npm run find-youtube-replacements -- --report      # only print the queue from the DB (no network)
 *   npm run find-youtube-replacements -- --max-searches=50
 *   npm run find-youtube-replacements -- --all         # ignore the cool-down (re-search everything)
 */
import { SERVER_CONFIG } from '../backend/backend-config';
import { getYoutubeVideoIdFromLink } from '@common/util/media-links-utils';
import { getSongPageLink } from '@common/util/misc-utils';
import { getTranslitLowerCase } from '@common/util/seo-translit';

const fs = require('fs');
const mysql = require('mysql2/promise');

/** Re-search an unresolved item only after this many days. */
const COOLDOWN_DAYS = 21;
/** Default cap on Data API searches per run (100 units each; daily quota 10000 => ~100). */
const DEFAULT_MAX_SEARCHES = 90;
/** Candidates requested per search. */
const RESULTS_PER_SEARCH = 5;
/** Delay between searches / oEmbed checks — gentle on YouTube. */
const DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 10_000;
/** Output file for the queue report. */
const REPORT_CSV_PATH = 'youtube-replacements.csv';

/**
 * Noise words stripped before comparing titles (both EN and RU). Transliterated to Latin so they
 * match after tokenize() also transliterates (e.g. "клип" -> "klip").
 */
const NOISE_WORDS = new Set(
  [
    'official', 'video', 'audio', 'lyric', 'lyrics', 'hd', 'hq', 'clip', 'mv', 'remastered', 'feat', 'ft',
    'клип', 'официальный', 'официальное', 'текст', 'минус', 'караоке', 'премьера',
  ].map(w => getTranslitLowerCase(w)),
);

interface Args {
  reportOnly: boolean;
  ignoreCooldown: boolean;
  maxSearches: number;
}

interface Candidate {
  videoId: string;
  title: string;
  channel: string;
  channelKind: 'topic' | 'vevo' | 'artist' | 'other';
  embeddable: boolean;
  score: number;
}

interface DueItem {
  songId: number;
  oldVideoId: string;
  collectionMount: string;
  songMount: string;
  query: string;
}

class QuotaExceededError extends Error {}

function parseArgs(argv: string[]): Args {
  const args: Args = { reportOnly: false, ignoreCooldown: false, maxSearches: DEFAULT_MAX_SEARCHES };
  for (const arg of argv) {
    if (arg === '--report') {
      args.reportOnly = true;
    } else if (arg === '--all') {
      args.ignoreCooldown = true;
    } else if (arg.startsWith('--max-searches=')) {
      const value = Number(arg.substring('--max-searches='.length));
      if (Number.isFinite(value) && value > 0) {
        args.maxSearches = value;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const connection = await mysql.createConnection(SERVER_CONFIG.dbConfig);
  try {
    if (!args.reportOnly) {
      const apiKey = SERVER_CONFIG.youtubeApiKey;
      if (!apiKey) {
        throw new Error('Missing "youtubeApiKey" in server-config.json — required to search YouTube.');
      }
      const due = await collectDueItems(connection, args);
      console.log(`${due.length} (song, broken video) item(s) due for search.`);
      await searchAndQueue(connection, due, apiKey, args);
    }
    await printQueueReport(connection);
  } finally {
    await connection.end();
  }
}

main()
  .then(() => console.info('Done'))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

/** Finds (song, broken video) pairs that need a search now: never searched, or past the cool-down. */
async function collectDueItems(connection: any, args: Args): Promise<DueItem[]> {
  const [collectionRows] = await connection.query('SELECT id, name, mount FROM collection');
  const collectionById = new Map<number, { name: string; mount: string }>();
  for (const row of collectionRows) {
    collectionById.set(row.id, { name: row.name || '', mount: row.mount });
  }

  const [brokenRows] = await connection.query('SELECT video_id FROM youtube_video_status WHERE embeddable = 0');
  const brokenIds = new Set<string>(brokenRows.map((r: any) => r.video_id));
  console.log(`${brokenIds.size} broken video id(s) in the cache.`);

  const [fixRows] = await connection.query('SELECT song_id, old_video_id, status, last_search_at FROM youtube_link_fix');
  const fixByKey = new Map<string, { status: string; lastSearchAt: Date | null }>();
  for (const row of fixRows) {
    fixByKey.set(`${row.song_id}|${row.old_video_id}`, {
      status: row.status,
      lastSearchAt: row.last_search_at ? new Date(row.last_search_at) : null,
    });
  }

  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const [songRows] = await connection.query('SELECT id, collection_id, mount, title, media_links FROM song');
  const due: DueItem[] = [];
  for (const song of songRows) {
    const links = String(song.media_links || '')
      .split('\n')
      .filter(l => l.length > 0);
    const seen = new Set<string>();
    for (const link of links) {
      const videoId = getYoutubeVideoIdFromLink(link);
      if (videoId === undefined || !brokenIds.has(videoId) || seen.has(videoId)) {
        continue;
      }
      seen.add(videoId);
      const existing = fixByKey.get(`${song.id}|${videoId}`);
      if (existing) {
        if (existing.status === 'approved' || existing.status === 'dismissed') {
          continue; // Resolved — never touch again.
        }
        if (!args.ignoreCooldown && existing.lastSearchAt && now - existing.lastSearchAt.getTime() < cooldownMs) {
          continue; // Searched recently — wait for the cool-down.
        }
      }
      const collection = collectionById.get(song.collection_id) || { name: '', mount: `collection-${song.collection_id}` };
      due.push({
        songId: song.id,
        oldVideoId: videoId,
        collectionMount: collection.mount,
        songMount: song.mount,
        query: `${collection.name} ${song.title}`.trim(),
      });
    }
  }
  return due;
}

/** Searches YouTube for each due item (up to the quota cap) and upserts the queue rows. */
async function searchAndQueue(connection: any, due: DueItem[], apiKey: string, args: Args): Promise<void> {
  const limit = Math.min(due.length, args.maxSearches);
  if (limit < due.length) {
    console.log(`Capped to ${limit} search(es) this run (quota). Remaining ${due.length - limit} will be picked up next run.`);
  }

  let withCandidates = 0;
  let noMatch = 0;
  for (let i = 0; i < limit; i++) {
    const item = due[i];
    let candidates: Candidate[];
    try {
      candidates = await searchYoutube(item.query, apiKey);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        console.warn(`YouTube quota exceeded after ${i} search(es) — stopping. Rest will be retried next run.`);
        break;
      }
      throw e;
    }

    const embeddable: Candidate[] = [];
    for (const c of candidates) {
      await sleep(DELAY_MS);
      if (await isEmbeddable(c.videoId)) {
        embeddable.push(c);
      }
    }
    embeddable.sort((a, b) => b.score - a.score);

    const status = embeddable.length > 0 ? 'needs_review' : 'no_match';
    const bestScore = embeddable.length > 0 ? embeddable[0].score : null;
    await connection.execute(
      `INSERT INTO youtube_link_fix (song_id, old_video_id, status, candidates, best_score, last_search_at, search_count)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
       ON DUPLICATE KEY UPDATE status = VALUES(status), candidates = VALUES(candidates),
         best_score = VALUES(best_score), last_search_at = CURRENT_TIMESTAMP, search_count = search_count + 1,
         resolved_at = NULL`,
      [item.songId, item.oldVideoId, status, embeddable.length > 0 ? JSON.stringify(embeddable) : null, bestScore],
    );

    if (status === 'needs_review') {
      withCandidates++;
    } else {
      noMatch++;
    }
    if ((i + 1) % 10 === 0) {
      console.log(`  ...searched ${i + 1}/${limit}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Searched. ${withCandidates} with candidate(s) -> needs_review, ${noMatch} -> no_match.`);
}

/** Calls the YouTube Data API search.list and returns scored candidates for the query. */
async function searchYoutube(query: string, apiKey: string): Promise<Candidate[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true` +
    `&maxResults=${RESULTS_PER_SEARCH}&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 403) {
    const body = await response.text();
    if (body.includes('quotaExceeded') || body.includes('dailyLimitExceeded')) {
      throw new QuotaExceededError();
    }
    throw new Error(`YouTube API 403: ${body.substring(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`YouTube API ${response.status}: ${(await response.text()).substring(0, 300)}`);
  }
  const data: any = await response.json();
  const queryTokens = tokenize(query);
  return (data.items || [])
    .filter((it: any) => it.id && it.id.videoId)
    .map((it: any) => {
      const title = decodeEntities(it.snippet?.title || '');
      const channel = decodeEntities(it.snippet?.channelTitle || '');
      const { score, channelKind } = scoreCandidate(queryTokens, title, channel);
      return { videoId: it.id.videoId, title, channel, channelKind, embeddable: true, score };
    });
}

/**
 * Scores a candidate 0..1 as title-similarity x channel-trust. Channel trust is highest for the
 * auto-generated "<Artist> - Topic" / VEVO / official-artist channels — those are our strongest
 * signal that it is the right song by the right performer.
 */
function scoreCandidate(
  queryTokens: string[],
  title: string,
  channel: string,
): { score: number; channelKind: Candidate['channelKind'] } {
  const haystack = new Set([...tokenize(title), ...tokenize(channel)]);
  const covered = queryTokens.filter(t => haystack.has(t)).length;
  const titleSimilarity = queryTokens.length === 0 ? 0 : covered / queryTokens.length;

  const lcChannel = channel.toLowerCase().trim();
  let channelKind: Candidate['channelKind'] = 'other';
  let channelTrust = 0.6;
  if (lcChannel.endsWith('- topic') || lcChannel.endsWith('- topic ')) {
    channelKind = 'topic';
    channelTrust = 1.0;
  } else if (lcChannel.includes('vevo')) {
    channelKind = 'vevo';
    channelTrust = 1.0;
  } else if (queryTokens.length > 0 && tokenize(channel).some(t => queryTokens.includes(t))) {
    channelKind = 'artist';
    channelTrust = 0.9;
  }
  return { score: round2(titleSimilarity * channelTrust), channelKind };
}

/** Reuses the oEmbed signal from the checker: 200 => embeddable, anything else => not. */
async function isEmbeddable(videoId: string): Promise<boolean> {
  const target = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    return response.status === 200;
  } catch {
    return false; // Treat unreachable as not-embeddable; it just won't be offered as a candidate.
  } finally {
    clearTimeout(timer);
  }
}

/** Prints the queue grouped by status and writes the full queue to CSV for eyeballing quality. */
async function printQueueReport(connection: any): Promise<void> {
  const [rows] = await connection.query(
    `SELECT f.song_id, f.old_video_id, f.status, f.best_score, f.candidates, f.search_count, f.last_search_at,
            s.title AS song_title, s.mount AS song_mount, c.mount AS collection_mount, c.name AS collection_name
     FROM youtube_link_fix f
     JOIN song s ON s.id = f.song_id
     JOIN collection c ON c.id = s.collection_id
     ORDER BY (f.status = 'needs_review') DESC, f.best_score DESC`,
  );

  const counts: Record<string, number> = {};
  const csvLines = ['status,collection,song,artist_title,old_video_id,best_score,best_candidate,best_channel'];
  for (const row of rows) {
    counts[row.status] = (counts[row.status] || 0) + 1;
    let best: Candidate | undefined;
    if (row.candidates) {
      try {
        best = (JSON.parse(row.candidates) as Candidate[])[0];
      } catch {
        best = undefined;
      }
    }
    const songUrl = getSongPageLink(row.collection_mount, row.song_mount);
    csvLines.push(
      [
        row.status,
        row.collection_mount,
        songUrl,
        `${row.collection_name} ${row.song_title}`.trim(),
        row.old_video_id,
        row.best_score ?? '',
        best ? `https://youtu.be/${best.videoId} (${best.title})` : '',
        best ? best.channel : '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  fs.writeFileSync(REPORT_CSV_PATH, csvLines.join('\n') + '\n');

  console.log('\n=== Replacement queue ===');
  for (const status of Object.keys(counts).sort()) {
    console.log(`  ${status}: ${counts[status]}`);
  }
  console.log(`Full queue (${rows.length} item(s)) written to ${REPORT_CSV_PATH}`);
}

function tokenize(s: string): string[] {
  // Normalize ё->е first (the transliterator maps them differently: уйдёшь->ujdyosh vs уйдешь->ujdesh),
  // then transliterate Cyrillic -> Latin so the same name in either script matches
  // (e.g. "Ундервуд" and "Undervud", "Ноль" and "Nol - Topic").
  return getTranslitLowerCase(s.replace(/ё/gi, 'е'))
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 1 && !NOISE_WORDS.has(t));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
