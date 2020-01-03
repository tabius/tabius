import {promisify} from 'util';
import {get, post, put} from 'request';
import {getNameFirstFormArtistName} from '@common/util/misc-utils';
import {CollectionType} from '@common/catalog-model';
import {MOUNT_COLLECTION_PREFIX} from '@common/mounts';
import {SERVER_CONFIG} from '@server/server-config';

const FORUM_URL = process.env.TABIUS_FORUM_URL;
if (FORUM_URL === undefined) {
  throw new Error('TABIUS_FORUM_URL is required.');
}

const BACKEND_URL = `https://${SERVER_CONFIG.serverHost}`;

const forumAuthToken = process.env.TABIUS_NODE_BB_AUTH_TOKEN;
if (forumAuthToken === undefined) {
  throw new Error('TABIUS_NODE_BB_AUTH_TOKEN is required.');
}

const ALL_COLLECTIONS_CATEGORY_ID = 5;
const mysql = require('mysql2/promise');
const [getAsync, postAsync, putAsync] = [get, post, put].map(promisify);

const DRY_RUN = !!process.env.DRY_RUN;
if (DRY_RUN) {
  console.info('Running in DRY RUN mode');
}

interface CollectionRow {
  id: number;
  type: CollectionType,
  name: string;
  mount: string;
  forum_category_id: number;
}

interface ForumCategory {
  cid: number;
  parentCid: number;
  name: string;
  description: string;
  icon: string;
  bgColor: string;
  color: string;
  slug: string;
  isSection: number
}

interface SongTopicRow {
  id: number;
  collection_id: number;
  title: string;
  mount: string;
  forum_topic_id: number;
}

interface ForumTopic {
  tid: number;
  posts: ForumPost;
}

interface ForumPost {
  pid: number;
  tid: number;
  content: string;
}

let nCategoriesCreated = 0;
let nCategoriesUpdated = 0;
let nTopicsCreated = 0;
let nTopicsUpdated = 0;

async function main() {
  const connection = await mysql.createConnection(SERVER_CONFIG.dbConfig);
  try {
    // check that all collections have valid category
    const sql = 'SELECT id, name, mount, type, forum_category_id FROM collection WHERE listed = 1 AND id IN (SELECT DISTINCT collection_id FROM song)';
    const [collectionsRows] = await connection.execute(sql) as CollectionRow[][];
    console.info(`Read ${collectionsRows.length} collections from DB`);
    const collectionById = new Map<number, CollectionRow>();
    for (const collection of collectionsRows) {
      await syncCollectionTopic(collection, connection);
      collectionById.set(collection.id, collection);
    }

    // check that all songs in listed collections have valid topics.
    const [songRows] = await connection.execute('SELECT id, collection_id, title, mount, forum_topic_id FROM song ' +
        'WHERE collection_id IN (SELECT id FROM collection WHERE listed = 1)');

    console.info(`Updating song topics, songs in db: ${songRows.length}`);
    for (let i = 0; i < songRows.length; i++) {
      const song = songRows[i];
      if (i > 0 && i % 1000 === 0) {
        console.info(`Sync songs progress: ${i}/${songRows.length}, created: ${nTopicsCreated}, updated: ${nTopicsUpdated}`);
      }
      await syncSongTopic(song, connection, collectionById);
    }
    console.info(`Collection categories created: ${nCategoriesCreated}, updated: ${nCategoriesUpdated}`);
    console.info(`Song topics created: ${nTopicsCreated}, updated: ${nTopicsUpdated}`);
  } finally {
    connection.end();
  }
}

main()
    .then(() => console.info('Done'))
    .catch(error => console.error(error));

async function getCategory(id: number): Promise<ForumCategory|string> {
  return (await getAsync(`${FORUM_URL}/api/category/${id}`, {json: true})).body;
}

function getCollectionPageUrl(collectionMount: string): string {
  return `https://tabius.ru/${MOUNT_COLLECTION_PREFIX}${collectionMount}`;
}

async function syncCollectionTopic(collection: CollectionRow, connection: any): Promise<void> {
  const category = collection.forum_category_id === 0 ? NOT_FOUND : await getCategory(collection.forum_category_id);
  const altCollectionName = getNameFirstFormArtistName(collection);
  const collectionPageUrl = getCollectionPageUrl(collection.mount);
  const payload: any = {
    json: true,
    headers: {
      Authorization: `Bearer ${forumAuthToken}`
    },
    form: {
      name: collection.name,
      description: `${altCollectionName} - обсуждаем подбор аккордов и новинки. ${collectionPageUrl}`,
      parentCid: ALL_COLLECTIONS_CATEGORY_ID,
      backgroundImage: `${BACKEND_URL}/images/collection/profile/${collection.mount}.jpg`,
    },
  };

  if (!isFound(category)) {
    nCategoriesCreated++;
    if (DRY_RUN) {
      console.info(`Dry run: Creating collection ${collection.mount}`);
      return;
    }
    const categoryResponse = (await postAsync(`${FORUM_URL}/api/v2/categories`, payload)).body;
    if (categoryResponse.code !== 'ok') {
      console.error('Failed to create collection category', collection, categoryResponse);
      throw new Error(`Failed to create collection category: ${collection.id}`);
    }
    const category = categoryResponse.payload as ForumCategory;
    collection.forum_category_id = category.cid;
    await connection.execute(`UPDATE collection SET forum_category_id = ${category.cid} WHERE id = ${collection.id}`);
    console.info(`Created new category for ${collection.mount}`);
  } else {
    const name = unescapeNodeBBString(category.name);
    const description = unescapeNodeBBString(category.description);
    if (name !== payload.form.name || description !== payload.form.description) {
      nCategoriesUpdated++;
      if (DRY_RUN) {
        console.info(`Dry run: Updating collection ${collection.mount}`, description, name !== payload.form.name, description !== payload.form.description);
        return;
      }
      const categoryResponse = (await putAsync(`${FORUM_URL}/api/v2/categories/${collection.forum_category_id}`, payload)).body;
      if (categoryResponse.code !== 'ok') {
        console.error('Failed to update collection category', collection, categoryResponse);
        throw new Error(`Failed to update collection category: ${collection.id}`);
      }
    }
  }
}

async function getTopic(id: number): Promise<ForumTopic|string> {
  return (await getAsync(`${FORUM_URL}/api/topic/${id}`, {json: true})).body;
}

function getSongPageUrl(collectionMount: string, songMount: string): string {
  return `https://tabius.ru/song/${collectionMount}/${songMount}`;
}

const MIN_NODEBB_TOPIC_TITLE_LENGTH = 3;

const NOT_FOUND = 'Not found';

function isFound<T>(v: T|string): v is T {
  return v !== NOT_FOUND;
}

async function syncSongTopic(song: SongTopicRow, connection: any, collectionById: Map<number, CollectionRow>): Promise<void> {
  const topic = song.forum_topic_id === 0 ? NOT_FOUND : await getTopic(song.forum_topic_id);
  const collection = collectionById.get(song.collection_id);
  if (collection === undefined) {
    throw new Error(`Failed to find collection for song + ${JSON.stringify(song)}`);
  }
  const collectionTypeName = collection.type === CollectionType.Person
                             ? 'исполнитель'
                             : (collection.type === CollectionType.Band
                                ? 'группа'
                                : 'коллекция');
  const songPageUrl = getSongPageUrl(collection.mount, song.mount);
  const collectionPageUrl = getCollectionPageUrl(collection.mount);
  const collectionName = getNameFirstFormArtistName(collection);
  const contentPrefix = `В этой теме обсуждаем и улучшаем подбор аккордов для песни `;
  const payload = {
    json: true,
    headers: {
      Authorization: `Bearer ${forumAuthToken}`
    },
    form: {
      cid: collection.forum_category_id,
      title: song.title.length >= MIN_NODEBB_TOPIC_TITLE_LENGTH ? song.title : `"${(song.title)}"`,
      content: contentPrefix +
          `[«${song.title}»](${songPageUrl}), ` +
          `${collectionTypeName}: [${collectionName}](${collectionPageUrl})`,
    },
  };

  if (!isFound<ForumTopic>(topic)) {
    nTopicsCreated++;
    if (DRY_RUN) {
      console.info(`Dry run: 'Creating'song ${collection.mount}/${song.mount}`);
      return;
    }
    const topicResponse = (await postAsync(`${FORUM_URL}/api/v2/topics`, payload)).body;
    if (topicResponse.code !== 'ok') {
      console.error('Failed to create song topic', song, topicResponse);
      throw new Error(`Failed to create song topic: ${song.id}`);
    }
    const topic = topicResponse.payload.topicData as ForumTopic;
    song.forum_topic_id = topic.tid;
    await connection.execute(`UPDATE song SET forum_topic_id = ${topic.tid} WHERE id = ${song.id}`);
    console.info(`Created new topic for ${collection!.mount}/${song.mount}`);
  } else {
    const post = topic.posts[0];
    const text = unescapeNodeBBString(post.content);
    const expectedText = '<p dir="auto">' + contentPrefix + '<a href="' + encodeURI(songPageUrl)
        + '" target="_blank" rel="noopener noreferrer nofollow">«' + song.title + '»</a>, ' + collectionTypeName
        + ': <a href="' + encodeURI(collectionPageUrl) + '" target="_blank" rel="noopener noreferrer nofollow">' + collectionName + '</a></p>\n';
    if (text !== expectedText) {
      nTopicsUpdated++;
      if (DRY_RUN) {
        console.info(`Dry run: 'Updating song ${collection.mount}/${song.mount}\n`, '[' + text + ']\n', '[' + expectedText + ']\n');
        return;
      }
      const updatePayload = {
        ...payload,
        form: {
          ...payload.form,
          tid: post.tid,
          pid: post.pid,
        }
      };
      const topicResponse = (await putAsync(`${FORUM_URL}/api/v2/topics/${post.tid}`, updatePayload)).body;
      if (topicResponse.code !== 'ok') {
        console.error('Failed to update song topic', song.id, topicResponse);
        throw new Error(`Failed to update song topic: ${song.id}`);
      }
    }
  }
}

function unescapeNodeBBString(val: string): string {
  return String(val)
      .replace(/&#(\d+);?/g, function (_, code) {
        return String.fromCharCode(code);
      })
      .replace(/&#[xX]([A-Fa-f0-9]+);?/g, function (_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      })
      .replace(/&([^;\W]+;?)/g, function (m, e) {
        const ee = e.replace(/;$/, '');
        const target = HTMLEntities[e] || (e.match(/;$/) && HTMLEntities[ee]);

        if (typeof target === 'number') {
          return String.fromCharCode(target);
        } else if (typeof target === 'string') {
          return target;
        }

        return m;
      });
}

/** This mapping is from NodeBB code.*/
const HTMLEntities = Object.freeze({
  amp: '&',
  gt: '>',
  lt: '<',
  quot: '"',
  apos: '\'',
  AElig: 198,
  Aacute: 193,
  Acirc: 194,
  Agrave: 192,
  Aring: 197,
  Atilde: 195,
  Auml: 196,
  Ccedil: 199,
  ETH: 208,
  Eacute: 201,
  Ecirc: 202,
  Egrave: 200,
  Euml: 203,
  Iacute: 205,
  Icirc: 206,
  Igrave: 204,
  Iuml: 207,
  Ntilde: 209,
  Oacute: 211,
  Ocirc: 212,
  Ograve: 210,
  Oslash: 216,
  Otilde: 213,
  Ouml: 214,
  THORN: 222,
  Uacute: 218,
  Ucirc: 219,
  Ugrave: 217,
  Uuml: 220,
  Yacute: 221,
  acirc: 226,
  aelig: 230,
  agrave: 224,
  aring: 229,
  atilde: 227,
  auml: 228,
  ccedil: 231,
  eacute: 233,
  ecirc: 234,
  egrave: 232,
  eth: 240,
  euml: 235,
  iacute: 237,
  icirc: 238,
  igrave: 236,
  iuml: 239,
  ntilde: 241,
  oacute: 243,
  ocirc: 244,
  ograve: 242,
  oslash: 248,
  otilde: 245,
  ouml: 246,
  szlig: 223,
  thorn: 254,
  uacute: 250,
  ucirc: 251,
  ugrave: 249,
  uuml: 252,
  yacute: 253,
  yuml: 255,
  copy: 169,
  reg: 174,
  nbsp: 160,
  iexcl: 161,
  cent: 162,
  pound: 163,
  curren: 164,
  yen: 165,
  brvbar: 166,
  sect: 167,
  uml: 168,
  ordf: 170,
  laquo: 171,
  not: 172,
  shy: 173,
  macr: 175,
  deg: 176,
  plusmn: 177,
  sup1: 185,
  sup2: 178,
  sup3: 179,
  acute: 180,
  micro: 181,
  para: 182,
  middot: 183,
  cedil: 184,
  ordm: 186,
  raquo: 187,
  frac14: 188,
  frac12: 189,
  frac34: 190,
  iquest: 191,
  times: 215,
  divide: 247,
  'OElig;': 338,
  'oelig;': 339,
  'Scaron;': 352,
  'scaron;': 353,
  'Yuml;': 376,
  'fnof;': 402,
  'circ;': 710,
  'tilde;': 732,
  'Alpha;': 913,
  'Beta;': 914,
  'Gamma;': 915,
  'Delta;': 916,
  'Epsilon;': 917,
  'Zeta;': 918,
  'Eta;': 919,
  'Theta;': 920,
  'Iota;': 921,
  'Kappa;': 922,
  'Lambda;': 923,
  'Mu;': 924,
  'Nu;': 925,
  'Xi;': 926,
  'Omicron;': 927,
  'Pi;': 928,
  'Rho;': 929,
  'Sigma;': 931,
  'Tau;': 932,
  'Upsilon;': 933,
  'Phi;': 934,
  'Chi;': 935,
  'Psi;': 936,
  'Omega;': 937,
  'alpha;': 945,
  'beta;': 946,
  'gamma;': 947,
  'delta;': 948,
  'epsilon;': 949,
  'zeta;': 950,
  'eta;': 951,
  'theta;': 952,
  'iota;': 953,
  'kappa;': 954,
  'lambda;': 955,
  'mu;': 956,
  'nu;': 957,
  'xi;': 958,
  'omicron;': 959,
  'pi;': 960,
  'rho;': 961,
  'sigmaf;': 962,
  'sigma;': 963,
  'tau;': 964,
  'upsilon;': 965,
  'phi;': 966,
  'chi;': 967,
  'psi;': 968,
  'omega;': 969,
  'thetasym;': 977,
  'upsih;': 978,
  'piv;': 982,
  'ensp;': 8194,
  'emsp;': 8195,
  'thinsp;': 8201,
  'zwnj;': 8204,
  'zwj;': 8205,
  'lrm;': 8206,
  'rlm;': 8207,
  'ndash;': 8211,
  'mdash;': 8212,
  'lsquo;': 8216,
  'rsquo;': 8217,
  'sbquo;': 8218,
  'ldquo;': 8220,
  'rdquo;': 8221,
  'bdquo;': 8222,
  'dagger;': 8224,
  'Dagger;': 8225,
  'bull;': 8226,
  'hellip;': 8230,
  'permil;': 8240,
  'prime;': 8242,
  'Prime;': 8243,
  'lsaquo;': 8249,
  'rsaquo;': 8250,
  'oline;': 8254,
  'frasl;': 8260,
  'euro;': 8364,
  'image;': 8465,
  'weierp;': 8472,
  'real;': 8476,
  'trade;': 8482,
  'alefsym;': 8501,
  'larr;': 8592,
  'uarr;': 8593,
  'rarr;': 8594,
  'darr;': 8595,
  'harr;': 8596,
  'crarr;': 8629,
  'lArr;': 8656,
  'uArr;': 8657,
  'rArr;': 8658,
  'dArr;': 8659,
  'hArr;': 8660,
  'forall;': 8704,
  'part;': 8706,
  'exist;': 8707,
  'empty;': 8709,
  'nabla;': 8711,
  'isin;': 8712,
  'notin;': 8713,
  'ni;': 8715,
  'prod;': 8719,
  'sum;': 8721,
  'minus;': 8722,
  'lowast;': 8727,
  'radic;': 8730,
  'prop;': 8733,
  'infin;': 8734,
  'ang;': 8736,
  'and;': 8743,
  'or;': 8744,
  'cap;': 8745,
  'cup;': 8746,
  'int;': 8747,
  'there4;': 8756,
  'sim;': 8764,
  'cong;': 8773,
  'asymp;': 8776,
  'ne;': 8800,
  'equiv;': 8801,
  'le;': 8804,
  'ge;': 8805,
  'sub;': 8834,
  'sup;': 8835,
  'nsub;': 8836,
  'sube;': 8838,
  'supe;': 8839,
  'oplus;': 8853,
  'otimes;': 8855,
  'perp;': 8869,
  'sdot;': 8901,
  'lceil;': 8968,
  'rceil;': 8969,
  'lfloor;': 8970,
  'rfloor;': 8971,
  'lang;': 9001,
  'rang;': 9002,
  'loz;': 9674,
  'spades;': 9824,
  'clubs;': 9827,
  'hearts;': 9829,
  'diams;': 9830,
});
