CREATE DATABASE tabius;
CREATE USER 'tabius'@'%' IDENTIFIED BY '12345';
GRANT ALL PRIVILEGES ON tabius.* TO 'tabius'@'%';

CREATE TABLE collection (
    id      INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(64),
    # 1 - person, 2 - band.
    type    INT NOT NULL DEFAULT 1,
    mount   VARCHAR(40)   NOT NULL UNIQUE,
    # Comma separated band ids. If the collection is a person this field may link it to the related band ids.
    band_ids VARCHAR(1024) NOT NULL  DEFAULT '',
    version INT NOT NULL DEFAULT 0,
    forum_category_id INT NOT NULL DEFAULT 0,
    listed INT(1) NOT NULL DEFAULT 0,
    user_id VARCHAR(40) DEFAULT NULL UNIQUE
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4,
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX collection_listed_index
	ON collection (listed);

CREATE INDEX collection_mount_index
	ON collection (mount);

CREATE TABLE song (
    id                   INT PRIMARY KEY AUTO_INCREMENT,
    # Main collection id. Usually a band.
    collection_id            INT  NOT NULL REFERENCES collection (id),
    mount                VARCHAR(64)  NOT NULL,
    title                VARCHAR(200) NOT NULL,
    # Song text with chords.
    content              TEXT         NOT NULL,
    # Set of media links for the song. One link per line.
    media_links VARCHAR(1024) NOT NULL DEFAULT '',
    version INT NOT NULL DEFAULT 0,
    forum_topic_id INT NOT NULL DEFAULT 0
) ENGINE InnoDB
  ROW_FORMAT = COMPRESSED
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE INDEX song_collection_id_index on song(collection_id);

CREATE TABLE user (
    id         VARCHAR(40) PRIMARY KEY,
    collection_id  INT NOT NULL REFERENCES collection (id),
    reg_date   DATETIME NOT NULL DEFAULT NOW(),
    login_date DATETIME     NOT NULL,
    settings TEXT
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE secondary_song_collections (
    song_id INT  NOT NULL REFERENCES song(id),
    collection_id INT  NOT NULL REFERENCES collection(id)
) ENGINE InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX secondary_song_collections_collection_id_index on secondary_song_collections(collection_id);
