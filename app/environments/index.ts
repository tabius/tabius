export interface TabiusEnv {

  /** Build type: production or not. */
  production: boolean;

  /** Backend URL for API calls. */
  backendUrl: string;

  /** Backend URL for API calls during server side rendering. */
  ssrBackendUrl: string;

  /** NodeBB (forum) URL. */
  nodeBbUrl: string,

  buildInfo: { buildDate: number; },
}
