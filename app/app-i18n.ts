import {getI18n} from '@common/i18n/i18n';
import {environment} from '@app/environments/environment';

/**
 * I18n context for tabius.
 *
 * Note:
 * We do not change it in runtime and have the same values in tests, so there is no need in injection,
 * observables, etc: using the most simple form of it here.
 */
export const I18N = getI18n(environment.app);
