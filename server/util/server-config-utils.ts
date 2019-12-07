const DEFAULT_TABIUS_CONFIG_DIR = '/opt/tabius/';

/** Returns active configuration directory. */
export function getConfigFilePath(fileOrSubdirPath: string): string {
  const configDir = process.env.TABIUS_CONFIG_DIR || DEFAULT_TABIUS_CONFIG_DIR;
  return configDir + fileOrSubdirPath;
}

/** Returns port to run Tabius. */
export function getServerPort(): number {
  // Note: this simplified logic is enough for today to separate tabius.ru from tabius.org.
  // It can be improved later if needed.
  return getConfigFilePath('') === DEFAULT_TABIUS_CONFIG_DIR ? 4001 : 24001;
}
