const DEFAULT_TABIUS_CONFIG_DIR = '/opt/tabius/';

export interface TabiusServerConfig {
  serverPort: number;
  corsOriginWhitelist: string[];
  sessionCookieName: string;
  ssoConfig: any;
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
  const configDir = process.env.TABIUS_CONFIG_DIR || DEFAULT_TABIUS_CONFIG_DIR;
  return configDir + fileOrSubdirPath;
}
