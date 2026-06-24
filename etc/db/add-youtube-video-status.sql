# Migration: add youtube_video_status cache table (see scripts/check-youtube-links.ts).
# Apply on an existing DB:  mysql -u tabius -p tabius < etc/db/add-youtube-video-status.sql

CREATE TABLE youtube_video_status (
    # YouTube video id extracted from a song media link. Real ids are 11 chars, but the lenient
    # link parser may yield longer strings for malformed links, so the column is generously sized.
    video_id    VARCHAR(255) NOT NULL PRIMARY KEY,
    # 1 if the video can be embedded on a tabius page (oEmbed returned 200), 0 otherwise.
    embeddable  TINYINT(1)  NOT NULL,
    # HTTP status returned by the last oEmbed check (0 means a network/transport error).
    http_status SMALLINT    NOT NULL,
    # Time of the last check. Updated on every re-check.
    checked_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX youtube_video_status_embeddable_index on youtube_video_status(embeddable);
