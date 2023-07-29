import {AuthConfig} from '@auth0/auth0-angular';

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

  /** Link to the official telegram channel. */
  telegramUrl: string;

  buildInfo: { buildDate: number; },

  /** Auth0 configuration. */
  authConfig: AuthConfig,

  sentryConfig: { dsn: string }
}
