/** Returns active configuration directory. */
export function getConfigDir(subdir: string): string {
  const configDir = process.env.TABIUS_CONFIG_DIR || '/opt/tabius/';
  return configDir + subdir;
}
