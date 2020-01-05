export interface TabiusEnv {

  /** Language: en, ru.. */
  lang: string,

  /** Build type: production or not. */
  production: boolean;

  /** tabius.org, tabius.ru, ... */
  domain: string;

  /** https://tabius.ru, https://tabius.org, ... */
  url: string;

  /** Backend URL for API calls. */
  backendUrl: string;

  /** Backend URL for API calls during server side rendering. */
  ssrBackendUrl: string;

  /** NodeBB (forum) URL. */
  nodeBbUrl: string,

  /** Topic id where chord fingering is discussed. */
  nodeBbChordsDiscussionTopicId?: number,

  buildInfo: { buildDate: number; },
}
