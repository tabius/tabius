import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { GetYoutubeLinkFixQueueResponse, YoutubeCandidate, YoutubeLinkFixItem, YoutubeLinkFixStatus } from '@common/api-model';
import { getYoutubeVideoIdFromLink } from '@common/util/media-links-utils';

interface QueueRow extends RowDataPacket {
  id: number;
  song_id: number;
  old_video_id: string;
  status: YoutubeLinkFixStatus;
  best_score: number | null;
  candidates: string | null;
  search_count: number;
  last_search_at: Date | null;
  song_title: string;
  song_mount: string;
  collection_name: string;
  collection_mount: string;
}

interface FixRow extends RowDataPacket {
  id: number;
  song_id: number;
  old_video_id: string;
}

interface SongLinksRow extends RowDataPacket {
  media_links: string;
}

@Injectable()
export class YoutubeLinkFixDbi {
  constructor(private readonly db: DbService) {}

  /** Returns the items awaiting moderator review, best candidates first. */
  async getQueue(limit: number): Promise<GetYoutubeLinkFixQueueResponse> {
    const [rows] = await this.db.pool.promise().query<QueueRow[]>(
      `SELECT f.id, f.song_id, f.old_video_id, f.status, f.best_score, f.candidates, f.search_count, f.last_search_at,
              s.title AS song_title, s.mount AS song_mount, c.name AS collection_name, c.mount AS collection_mount
       FROM youtube_link_fix f
       JOIN song s ON s.id = f.song_id
       JOIN collection c ON c.id = s.collection_id
       WHERE f.status = 'needs_review'
       ORDER BY f.best_score DESC, f.id ASC
       LIMIT ?`,
      [limit],
    );
    return { items: rows.map(toItem) };
  }

  /**
   * Approves a candidate: replaces the broken link in the song's media_links with the new video,
   * bumps the song version, and marks the queue item resolved. Returns the new status.
   */
  async approve(id: number, newVideoId: string): Promise<YoutubeLinkFixStatus> {
    const fix = await this.getFixRow(id);
    const [songRows] = await this.db.pool
      .promise()
      .query<SongLinksRow[]>('SELECT media_links FROM song WHERE id = ?', [fix.song_id]);
    if (songRows.length === 0) {
      throw new Error(`Song not found: ${fix.song_id}`);
    }
    const links = String(songRows[0].media_links || '').split('\n');
    let replaced = false;
    const newLinks = links.map(link => {
      if (!replaced && link.length > 0 && getYoutubeVideoIdFromLink(link) === fix.old_video_id) {
        replaced = true;
        return `https://youtu.be/${newVideoId}`;
      }
      return link;
    });
    if (!replaced) {
      throw new Error(`Broken link ${fix.old_video_id} is no longer present in song ${fix.song_id}`);
    }
    const mediaLinks = newLinks.filter(l => l.length > 0).join('\n');
    await this.db.pool
      .promise()
      .query<ResultSetHeader>('UPDATE song SET media_links = ?, version = version + 1 WHERE id = ?', [mediaLinks, fix.song_id]);
    await this.setStatus(id, 'approved');
    return 'approved';
  }

  /** Rejects all candidates: the worker will search again after the cool-down. */
  async reject(id: number): Promise<YoutubeLinkFixStatus> {
    await this.getFixRow(id); // Ensure it exists.
    await this.setStatus(id, 'rejected');
    return 'rejected';
  }

  /** Dismisses the item permanently: the worker will never search for it again. */
  async dismiss(id: number): Promise<YoutubeLinkFixStatus> {
    await this.getFixRow(id); // Ensure it exists.
    await this.setStatus(id, 'dismissed');
    return 'dismissed';
  }

  private async getFixRow(id: number): Promise<FixRow> {
    const [rows] = await this.db.pool
      .promise()
      .query<FixRow[]>('SELECT id, song_id, old_video_id FROM youtube_link_fix WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error(`youtube_link_fix item not found: ${id}`);
    }
    return rows[0];
  }

  private async setStatus(id: number, status: YoutubeLinkFixStatus): Promise<void> {
    await this.db.pool
      .promise()
      .query<ResultSetHeader>('UPDATE youtube_link_fix SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
  }
}

function toItem(row: QueueRow): YoutubeLinkFixItem {
  let candidates: YoutubeCandidate[] = [];
  if (row.candidates) {
    try {
      candidates = JSON.parse(row.candidates) as YoutubeCandidate[];
    } catch {
      candidates = [];
    }
  }
  return {
    id: row.id,
    songId: row.song_id,
    songTitle: row.song_title,
    collectionName: row.collection_name,
    collectionMount: row.collection_mount,
    songMount: row.song_mount,
    oldVideoId: row.old_video_id,
    status: row.status,
    bestScore: row.best_score,
    candidates,
    searchCount: row.search_count,
    lastSearchAt: row.last_search_at ? new Date(row.last_search_at).toISOString() : null,
  };
}
