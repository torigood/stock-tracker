import { usePortfolioStore } from '../store/portfolioStore'
import { translations } from '../i18n/translations'
import type { TranslationKey } from '../i18n/translations'

export function useI18n() {
  const language = usePortfolioStore((s) => s.language)

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const dict = translations[language]
    let str: string = dict[key] ?? translations.ko[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return str
  }

  return { t, language }
}
