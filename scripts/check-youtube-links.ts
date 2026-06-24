/**
 * Background checker for YouTube media links.
 *
 * Tabius embeds YouTube videos on song pages, so a video that is deleted, private or has embedding
 * disabled is useless to us. The YouTube oEmbed endpoint returns 200 only for videos that can be
 * embedded, which is exactly the property we care about — so a non-200 response means "broken".
 *
 * The script collects all YouTube video ids referenced by songs, checks the ones that were never
 * checked or are stale, and caches the result in the `youtube_video_status` table.
 *
 * Videos are checked one at a time with a pause between requests (see --delay-ms) so we never
 * overload YouTube or risk a ban. There is no hurry: the intended use is a once-a-day cron.
 *
 * Usage:
 *   npm run check-youtube                  # check new/stale videos, then print broken report
 *   npm run check-youtube -- --report      # only print the report from the cache (no network)
 *   npm run check-youtube -- --all         # re-check every video regardless of age
 *   npm run check-youtube -- --max-age-days=7
 *   npm run check-youtube -- --delay-ms=500   # pause between requests (default 300)
 *
 * Daily cron (sweep everything checked more than a day ago):
 *   npm run check-youtube -- --max-age-days=1
 */
import { SERVER_CONFIG } from '../backend/backend-config';
import { getYoutubeVideoIdFromLink } from '@common/util/media-links-utils';
import { getSongPageLink } from '@common/util/misc-utils';

const fs = require('fs');
const mysql = require('mysql2/promise');

/** Pause between requests. Checks run one at a time — gentle on purpose, a daily cron has all day. */
const DEFAULT_DELAY_MS = 300;
/** Per-request timeout. */
const REQUEST_TIMEOUT_MS = 10_000;
/** Retries on network errors / 429. */
const MAX_RETRIES = 3;
/** Default re-check period: skip videos checked more recently than this. */
const DEFAULT_MAX_AGE_DAYS = 30;
/** Output file for the broken-links report. */
const REPORT_CSV_PATH = 'broken-youtube.csv';

interface Args {
  reportOnly: boolean;
  checkAll: boolean;
  maxAgeDays: number;
  delayMs: number;
}

interface SongRef {
  songId: number;
  collectionMount: string;
  songMount: string;
}

interface CachedStatus {
  videoId: string;
  embeddable: boolean;
  httpStatus: number;
  checkedAt: Date;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { reportOnly: false, checkAll: false, maxAgeDays: DEFAULT_MAX_AGE_DAYS, delayMs: DEFAULT_DELAY_MS };
  for (const arg of argv) {
    if (arg === '--report') {
      args.reportOnly = true;
    } else if (arg === '--all') {
      args.checkAll = true;
    } else if (arg.startsWith('--max-age-days=')) {
      const value = Number(arg.substring('--max-age-days='.length));
      if (Number.isFinite(value) && value >= 0) {
        args.maxAgeDays = value;
      }
    } else if (arg.startsWith('--delay-ms=')) {
      const value = Number(arg.substring('--delay-ms='.length));
      if (Number.isFinite(value) && value >= 0) {
        args.delayMs = value;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const connection = await mysql.createConnection(SERVER_CONFIG.dbConfig);
  try {
    const videoToSongs = await buildVideoToSongsMap(connection);
    console.log(`Found ${videoToSongs.size} unique YouTube video ids across all songs.`);

    if (!args.reportOnly) {
      await checkVideos(connection, [...videoToSongs.keys()], args);
    }
    await printBrokenReport(connection, videoToSongs);
  } finally {
    await connection.end();
  }
}

main()
  .then(() => console.info('Done'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

/** Reads all songs and maps every referenced YouTube video id to the songs that use it. */
async function buildVideoToSongsMap(connection: any): Promise<Map<string, SongRef[]>> {
  const [collectionRows] = await connection.query('SELECT id, mount FROM collection');
  const collectionMountById = new Map<number, string>();
  for (const row of collectionRows) {
    collectionMountById.set(row.id, row.mount);
  }

  const [songRows] = await connection.query('SELECT id, collection_id, mount, media_links FROM song');
  const videoToSongs = new Map<string, SongRef[]>();
  for (const row of songRows) {
    const links: string[] = String(row.media_links || '')
      .split('\n')
      .filter(l => l.length > 0);
    for (const link of links) {
      const videoId = getYoutubeVideoIdFromLink(link);
      if (videoId === undefined) {
        continue;
      }
      const ref: SongRef = {
        songId: row.id,
        collectionMount: collectionMountById.get(row.collection_id) || `collection-${row.collection_id}`,
        songMount: row.mount,
      };
      const refs = videoToSongs.get(videoId);
      if (refs) {
        refs.push(ref);
      } else {
        videoToSongs.set(videoId, [ref]);
      }
    }
  }
  return videoToSongs;
}

/** Checks the video ids that are new or stale and upserts their status into the cache table. */
async function checkVideos(connection: any, allVideoIds: string[], args: Args): Promise<void> {
  const [cacheRows] = await connection.query('SELECT video_id, checked_at FROM youtube_video_status');
  const checkedAtById = new Map<string, Date>();
  for (const row of cacheRows) {
    checkedAtById.set(row.video_id, new Date(row.checked_at));
  }

  const now = Date.now();
  const maxAgeMs = args.maxAgeDays * 24 * 60 * 60 * 1000;
  const toCheck = allVideoIds.filter(id => {
    if (args.checkAll) {
      return true;
    }
    const checkedAt = checkedAtById.get(id);
    return checkedAt === undefined || now - checkedAt.getTime() >= maxAgeMs;
  });

  const etaMin = Math.ceil((toCheck.length * args.delayMs) / 1000 / 60);
  console.log(
    `Checking ${toCheck.length} video(s) (skipping ${allVideoIds.length - toCheck.length} fresh), ` +
      `${args.delayMs}ms between requests (~${etaMin} min).`,
  );

  let done = 0;
  let failed = 0;
  for (const videoId of toCheck) {
    const result = await checkEmbeddable(videoId);
    if (result === undefined) {
      failed++; // Network error after retries — leave the cache untouched, re-check next run.
    } else {
      await connection.execute(
        `INSERT INTO youtube_video_status(video_id, embeddable, http_status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE embeddable = VALUES(embeddable), http_status = VALUES(http_status), checked_at = CURRENT_TIMESTAMP`,
        [videoId, result.embeddable ? 1 : 0, result.httpStatus],
      );
      done++;
      if (done % 50 === 0) {
        console.log(`  ...checked ${done}/${toCheck.length}`);
      }
    }
    await sleep(args.delayMs); // Pause between requests so we stay gentle on YouTube.
  }
  console.log(`Checked ${done} video(s). ${failed} could not be reached (will retry next run).`);
}

/**
 * Queries the YouTube oEmbed endpoint for a video. 200 => embeddable. Any other HTTP status => not
 * embeddable (deleted, private or embedding disabled). Returns undefined on a network error after
 * all retries, so the caller can leave the cache untouched and try again later.
 */
async function checkEmbeddable(videoId: string): Promise<{ embeddable: boolean; httpStatus: number } | undefined> {
  const target = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
      if (response.status === 429) {
        await sleep(1000 * attempt);
        continue; // Rate limited — back off and retry.
      }
      return { embeddable: response.status === 200, httpStatus: response.status };
    } catch (e) {
      if (attempt === MAX_RETRIES) {
        console.warn(`  Network error checking ${videoId}: ${(e as Error).message}`);
        return undefined;
      }
      await sleep(500 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return undefined;
}

/** Prints (and writes to CSV) all broken videos from the cache, mapped back to the songs using them. */
async function printBrokenReport(connection: any, videoToSongs: Map<string, SongRef[]>): Promise<void> {
  const [rows] = await connection.query(
    'SELECT video_id, http_status, checked_at FROM youtube_video_status WHERE embeddable = 0 ORDER BY checked_at DESC',
  );
  const broken: CachedStatus[] = rows.map((row: any) => ({
    videoId: row.video_id,
    embeddable: false,
    httpStatus: row.http_status,
    checkedAt: new Date(row.checked_at),
  }));

  const host = SERVER_CONFIG.serverHost || 'tabius.ru';
  const baseUrl = `https://${host}`;
  const csvLines = ['collection,song,song_url,youtube_url,http_status,checked_at'];

  console.log(`\n=== Broken YouTube videos: ${broken.length} ===`);
  let songLinkCount = 0;
  for (const status of broken) {
    const refs = videoToSongs.get(status.videoId) || [];
    const youtubeUrl = `https://www.youtube.com/watch?v=${status.videoId}`;
    if (refs.length === 0) {
      // Video is in the cache but no longer referenced by any song — safe to ignore.
      continue;
    }
    for (const ref of refs) {
      songLinkCount++;
      const songUrl = `${baseUrl}${getSongPageLink(ref.collectionMount, ref.songMount)}`;
      console.log(
        `  [${status.httpStatus}] ${ref.collectionMount}/${ref.songMount}\n` +
          `        song:    ${songUrl}\n` +
          `        youtube: ${youtubeUrl}  (checked ${formatDate(status.checkedAt)})`,
      );
      csvLines.push(
        [ref.collectionMount, ref.songMount, songUrl, youtubeUrl, status.httpStatus, formatDate(status.checkedAt)]
          .map(csvCell)
          .join(','),
      );
    }
  }
  fs.writeFileSync(REPORT_CSV_PATH, csvLines.join('\n') + '\n');
  console.log(`\nReport with ${songLinkCount} broken song link(s) written to ${REPORT_CSV_PATH}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
