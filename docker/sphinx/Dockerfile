FROM debian:bullseye-slim

# Sphinx 3.x is closed-source freeware distributed only as a tarball (no official image).
ARG SPHINX_URL=http://sphinxsearch.com/files/sphinx-3.3.1-b72d67b-linux-amd64.tar.gz

# libmariadb is required by Sphinx's `type = mysql` source driver (see doc/sphinxsearch.txt).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl libmariadb3 libmariadb-dev \
    && rm -rf /var/lib/apt/lists/* \
    # Sphinx 3.x binaries link against libmysqlclient.so.* — point it at libmariadb.
    && ln -sf "$(find / -name 'libmariadb.so*' | head -1)" /usr/lib/x86_64-linux-gnu/libmysqlclient.so.20 \
    && ldconfig

RUN curl -fSL "$SPHINX_URL" -o /tmp/sphinx.tar.gz \
    && tar -xzf /tmp/sphinx.tar.gz -C /tmp \
    && cp /tmp/sphinx-*/bin/* /usr/bin/ \
    && rm -rf /tmp/sphinx*

# Lemmatizer dictionaries for `morphology = lemmatize_ru_all,lemmatize_en_all`.
RUN mkdir -p /opt/tabius-common/sphinx/dict /opt/tabius-common/sphinx/data /var/log/sphinxsearch /var/run/sphinxsearch \
    && curl -fSL http://sphinxsearch.com/files/dicts/ru.pak -o /opt/tabius-common/sphinx/dict/ru.pak \
    && curl -fSL http://sphinxsearch.com/files/dicts/en.pak -o /opt/tabius-common/sphinx/dict/en.pak

COPY sphinx.conf /etc/sphinxsearch/sphinx.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9307
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
