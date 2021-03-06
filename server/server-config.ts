import {readFileSync} from 'fs';

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

const serverConfigAsString = readFileSync(getConfigFilePath('server-config.json')).toString();
const CONFIG_FROM_FILE: TabiusServerConfig = JSON.parse(serverConfigAsString) as TabiusServerConfig;

const DEFAULT_CONFIG: Partial<TabiusServerConfig> = {
  serverPort: 4001,
  corsOriginWhitelist: [
    // The server itself.
    'http://localhost:4001',
    // SSR app port.
    'http://localhost:4200',
    // Non-SSR app port.
    'http://localhost:4201'
  ],
  sessionCookieName: 'tabius.sid',
};

export const SERVER_CONFIG: Readonly<TabiusServerConfig> = {
  ...DEFAULT_CONFIG,
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
