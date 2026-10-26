import { useTranslation } from 'react-i18next';
import { I18N_DEFAULT_NAMESPACE, LANGUAGES } from '@/constants/i18n';
import { LAZY_AREAS, type LazyArea } from '@/locales/lazyAreas';

/**
 * Adds a lazy locale area (both languages) to the running i18n instance before the page's first `t()` call.
 * Idempotent: the bundles are added once per instance; switching language needs nothing more.
 */
export function useLazyStrings(area: LazyArea): void {
  const { i18n } = useTranslation();
  for (const language of LANGUAGES) {
    const bundle = LAZY_AREAS[area][language];
    const [firstKey] = Object.keys(bundle);
    if (firstKey && i18n.getResource(language, I18N_DEFAULT_NAMESPACE, firstKey) === undefined)
      i18n.addResourceBundle(language, I18N_DEFAULT_NAMESPACE, bundle, true, false);
  }
}
