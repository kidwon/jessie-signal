import { createContext, useContext, useState } from 'react'

const I18nContext = createContext({ lang: 'zh', setLang: () => {} })

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mp_lang') || 'zh')
  function toggle() {
    const next = lang === 'zh' ? 'en' : 'zh'
    setLang(next)
    localStorage.setItem('mp_lang', next)
  }
  return <I18nContext.Provider value={{ lang, toggle }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
