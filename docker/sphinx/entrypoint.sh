#!/bin/sh
set -e

CONF=/etc/sphinxsearch/sphinx.conf

mkdir -p /var/log/sphinxsearch /var/run/sphinxsearch /opt/tabius-common/sphinx/data

# Build/refresh the index from MariaDB before starting the daemon.
# depends_on(condition: service_healthy) guarantees MariaDB is reachable by now.
echo "[sphinx] indexing tabius_ru_song_index from MariaDB..."
indexer --config "$CONF" --all

echo "[sphinx] starting searchd (http on :9307)..."
exec searchd --config "$CONF" --nodetach
