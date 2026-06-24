# Migration: add youtube_link_fix review queue (see scripts/find-youtube-replacements.ts).
# Apply on an existing DB:  mysql -u tabius -p tabius < etc/db/add-youtube-link-fix.sql

CREATE TABLE youtube_link_fix (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    song_id        INT          NOT NULL REFERENCES song (id),
    # The broken video id currently referenced by the song.
    old_video_id   VARCHAR(255) NOT NULL,
    # needs_review | approved | rejected | no_match | dismissed.
    status         VARCHAR(16)  NOT NULL DEFAULT 'no_match',
    # JSON array of candidates: [{videoId,title,channel,channelKind,embeddable,score}].
    candidates     LONGTEXT     NULL,
    # Score of the best candidate (0..1), for sorting the queue.
    best_score     FLOAT        NULL,
    # Time of the last YouTube search. Re-search only after a cool-down (see the worker).
    last_search_at TIMESTAMP    NULL DEFAULT NULL,
    # How many times we searched YouTube for this song/video.
    search_count   INT          NOT NULL DEFAULT 0,
    # Time the moderator approved/rejected/dismissed the item.
    resolved_at    TIMESTAMP    NULL DEFAULT NULL
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX youtube_link_fix_song_video_index on youtube_link_fix(song_id, old_video_id);
CREATE INDEX youtube_link_fix_status_index on youtube_link_fix(status);
