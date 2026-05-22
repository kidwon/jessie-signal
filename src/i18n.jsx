import { createContext, useContext, useState } from 'react'

const LANGS = ['zh', 'en', 'ja']

const I18nContext = createContext({ lang: 'zh', toggle: () => {} })

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mp_lang') || 'zh')

  function toggle() {
    const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]
    setLang(next)
    localStorage.setItem('mp_lang', next)
  }

  function setLangDirect(l) {
    setLang(l)
    localStorage.setItem('mp_lang', l)
  }

  return (
    <I18nContext.Provider value={{ lang, toggle, setLang: setLangDirect }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
