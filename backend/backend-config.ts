import { readFileSync } from 'fs';

export interface TabiusBackendConfig {
  /**  e.g. 'tabius.ru' . */
  serverHost: string;
  serverPort: number;
  /** e.g. /opt/tabius... */
  resourcesDir: string;
  corsOriginWhitelist: string[];
  /** MariaDB/MySQL connector config. */
  dbConfig: any;

  /** Auth0 domain and client id. */
  auth: {
    domain: string;
    clientId: string;
  };

  /** Name of the song index in Sphinx.*/
  sphinxSongIndex: string;
  /** 'en', 'ru'... See I18n interface. */
  lang: string;
}

const serverConfigAsString = readFileSync(getConfigFilePath('server-config.json')).toString();
const CONFIG_FROM_FILE: TabiusBackendConfig = JSON.parse(serverConfigAsString) as TabiusBackendConfig;

const DEFAULT_CONFIG: Partial<TabiusBackendConfig> = {
  serverPort: 12100,
  corsOriginWhitelist: [
    // Nest server.
    'http://localhost:12100',
    // SSR app.
    'http://localhost:12101',
    // Non-SSR app.
    'http://localhost:12102',
  ],
};

export const SERVER_CONFIG: Readonly<TabiusBackendConfig> = {
  ...DEFAULT_CONFIG,
  ...CONFIG_FROM_FILE,
};

/** Returns active configuration directory. */
export function getConfigFilePath(fileOrSubdirPath: string): string {
  const configDir = process.env.TABIUS_CONFIG_DIR || '/home/bigapple/work/tabius/local/server-config';
  // if (!configDir) {
  //   throw new Error('No TABIUS_CONFIG_DIR environment variable found!');
  // }
  return `${configDir}/${fileOrSubdirPath}`;
}
