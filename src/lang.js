// Pure i18n constants + helper (no React) so the provider file can stay a
// component-only module for Fast Refresh.

export const LANGS = ['zh', 'en', 'ja', 'fr', 'de', 'ru']

export const LANG_LABELS = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
}

// Pick a localized value from a { zh, en, ja, fr, de, ru } map, falling back to
// English (then any available value) when a translation is missing.
export function tr(lang, map) {
  return map[lang] ?? map.en ?? map.zh ?? Object.values(map)[0] ?? ''
}
