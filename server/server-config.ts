export interface TabiusServerConfig {
  /**  e.g. 'tabius.ru' . */
  serverHost: string;
  serverPort: number;
  /** e.g. /opt/tabius... */
  resourcesDir: string;
  corsOriginWhitelist: string[];
  sessionCookieName: string;
  ssoConfig: any;
  /** MariaDB/MySQL connector config. */
  dbConfig: any;

  /** Name of the song index in Sphinx.*/
  sphinxSongIndex: string;
  /** 'en', 'ru'... See I18n interface. */
  lang: string;
}

const CONFIG_FROM_FILE = require(getConfigFilePath('server-config.json'));

export const SERVER_CONFIG: Readonly<TabiusServerConfig> = {
  serverPort: 4001,
  corsOriginWhitelist: ['http://localhost:4001', 'http://localhost:4201'],
  sessionCookieName: 'tabius.sid',
  ...CONFIG_FROM_FILE
};

/** Returns active configuration directory. */
export function getConfigFilePath(fileOrSubdirPath: string): string {
  const configDir = process.env.TABIUS_CONFIG_DIR;
  if (!configDir) {
    throw new Error('No TABIUS_CONFIG_DIR environment variable found!');
  }
  return `${configDir}/${fileOrSubdirPath}`;
}
