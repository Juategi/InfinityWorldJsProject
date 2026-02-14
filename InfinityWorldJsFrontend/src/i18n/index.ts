import { es } from './es'
import { en } from './en'
import { fr } from './fr'
import { de } from './de'

export type Language = 'es' | 'en' | 'fr' | 'de'

const DICTIONARIES: Record<Language, Record<string, string>> = { es, en, fr, de }
const SUPPORTED: Language[] = ['es', 'en', 'fr', 'de']
const STORAGE_KEY = 'iw_lang'
const FALLBACK: Language = 'es'

let current: Language = FALLBACK

/** Detect language from browser or localStorage */
function detectLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && SUPPORTED.includes(saved as Language)) {
    return saved as Language
  }

  const browserLang = navigator.language.split('-')[0].toLowerCase()
  if (SUPPORTED.includes(browserLang as Language)) {
    return browserLang as Language
  }

  return FALLBACK
}

// Initialize on module load
current = detectLanguage()

/** Get translated text for a key. Falls back to Spanish, then returns the key itself. */
export function t(key: string): string {
  return DICTIONARIES[current][key] ?? DICTIONARIES[FALLBACK][key] ?? key
}

/** Get the current language */
export function getLang(): Language {
  return current
}

/** Set the language and persist it */
export function setLang(lang: Language): void {
  current = lang
  localStorage.setItem(STORAGE_KEY, lang)
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }))
}

/** Get list of supported languages with display names */
export function getSupportedLanguages(): Array<{ code: Language; name: string }> {
  return [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
  ]
}
