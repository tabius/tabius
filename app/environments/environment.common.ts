import { AuthConfig } from '@auth0/auth0-angular';
import { AUTH0_WEB_CLIENT_AUDIENCE } from '@common/common-constants';

export const AUTH0_COMMON_CONFIG: Partial<AuthConfig> = {
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
  authorizationParams: {
    audience: AUTH0_WEB_CLIENT_AUDIENCE,
    redirect_uri: typeof window === 'object' ? window.location.origin : 'TODO',
  },
};
