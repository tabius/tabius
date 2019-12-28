export interface TabiusEnv {

  /** Build type: production or not. */
  production: boolean;

  /** tabius.org, tabius.ru */
  domain: string;

  /** Backend URL for API calls. */
  backendUrl: string;

  /** Backend URL for API calls during server side rendering. */
  ssrBackendUrl: string;

  /** NodeBB (forum) URL. */
  nodeBbUrl: string,

  buildInfo: { buildDate: number; },
}
