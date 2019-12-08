const DEFAULT_DB_CONFIG = {
  host: 'localhost',
  user: 'tabius',
  password: '12345',
  database: 'tabius',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export function readDbConfig() {
  const configPath = process.env.TABIUS_DB_CONFIG_PATH;
  if (configPath) {
    const dbConfigAdjustment = require(configPath);
    return {...DEFAULT_DB_CONFIG, ...dbConfigAdjustment};
  }
  return DEFAULT_DB_CONFIG;
}

