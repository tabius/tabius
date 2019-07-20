CREATE DATABASE tabius;
CREATE USER 'tabius'@'%' IDENTIFIED BY '12345';
GRANT ALL PRIVILEGES ON tabius.* TO 'tabius'@'%';

CREATE TABLE artist (
    id      INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(64),
    # 1 - person, 2 - band.
    type    INT NOT NULL DEFAULT 1,
    mount   VARCHAR(40)   NOT NULL UNIQUE,
    # Comma separated band ids. If the artist is a person this field may link it to the related band artist ids.
    band_ids VARCHAR(1024) NOT NULL  DEFAULT '',
    version INT NOT NULL DEFAULT 0,
    forum_category_id INT NOT NULL DEFAULT 0,
    listed INT(1) NOT NULL DEFAULT 0,
    user_id VARCHAR(40) DEFAULT NULL
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4,
  COLLATE utf8mb4_unicode_ci;

create index artist_listed_index
	on artist (listed);

CREATE TABLE song (
    id                   INT PRIMARY KEY AUTO_INCREMENT,
    # Main artist. Usually a band.
    artist_id            INT  NOT NULL REFERENCES artist (id),
    mount                VARCHAR(64)  NOT NULL,
    title                VARCHAR(200) NOT NULL,
    # SongDetails content format. 0 -> pre-formatted text
    format               INT          NOT NULL,
    # SongDetails text. Format is defined by 'format' field.
    content              TEXT         NOT NULL,
    # More artists related to the song.
    secondary_artist_ids VARCHAR(128) NOT NULL DEFAULT '',
    # Set of media links for the song. One link per line.
    media_links VARCHAR(1024) NOT NULL DEFAULT '',
    version INT NOT NULL DEFAULT 0,
    forum_topic_id INT NOT NULL DEFAULT 0
) ENGINE InnoDB
  ROW_FORMAT = COMPRESSED
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE INDEX song_artist_id_index on song(artist_id);

CREATE TABLE user (
    id         VARCHAR(40) PRIMARY KEY,
    # if null - user is not an ArtistDetails.
    artist_id  INT NOT NULL REFERENCES artist (id),
    reg_date   DATETIME NOT NULL DEFAULT NOW(),
    login_date DATETIME     NOT NULL,
    settings TEXT
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE playlist (
    id       VARCHAR(16)   PRIMARY KEY,
    name     VARCHAR(100)  NOT NULL,
    user_id  VARCHAR(40)   NOT NULL REFERENCES user (id),
    shared   TINYINT       NOT NULL DEFAULT 0,
    # Ids of songs. Comma separated.
    song_ids VARCHAR(2048) NOT NULL DEFAULT '',
    version  INT NOT NULL DEFAULT 0
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;
