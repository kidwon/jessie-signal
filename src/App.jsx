import { I18nProvider, useI18n } from './i18n.jsx'
import MarketPulse from './MarketPulse'

function Header() {
  const { lang, toggle } = useI18n()
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <span className="text-sm font-semibold text-gray-300">Market Pulse</span>
      <button
        onClick={toggle}
        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 transition-colors"
      >
        {lang === 'zh' ? 'EN' : '中文'}
      </button>
    </header>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <main className="py-6">
          <MarketPulse />
        </main>
      </div>
    </I18nProvider>
  )
}
