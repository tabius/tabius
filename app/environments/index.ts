export interface TabiusEnv {
  production: boolean,
  backendUrl: string,
  nodeBbUrl: string,
  nodeBbCookieDomain: string,
  buildInfo: { buildDate: number; },
}
