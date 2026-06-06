import { createContext, useContext, useState } from 'react'
import { LANGS } from './lang.js'

// First visit: use the browser's language if we support it, else English.
function detectLang() {
  const stored = localStorage.getItem('mp_lang')
  if (stored && LANGS.includes(stored)) return stored
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en')
    .slice(0, 2)
    .toLowerCase()
  return LANGS.includes(nav) ? nav : 'en'
}

const I18nContext = createContext({ lang: 'en', setLang: () => {} })

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectLang)

  function setLangDirect(l) {
    setLang(l)
    localStorage.setItem('mp_lang', l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangDirect }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
