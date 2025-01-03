import { AuthConfig } from '@auth0/auth0-angular';

export type TabiusAppType = 'ru' | 'org';

export interface TabiusEnv {
  app: TabiusAppType;

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

  buildInfo: { buildDate: number };

  /** Auth0 configuration. */
  auth0Config: AuthConfig;

  sentryConfig: { dsn: string };
}
