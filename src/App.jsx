import { I18nProvider, useI18n } from './i18n.jsx'
import MarketPulse from './MarketPulse'

const S = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 1.25rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  logoText: {
    fontFamily: 'JetBrains Mono',
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.22em',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  cursor: {
    fontFamily: 'JetBrains Mono',
    fontSize: '12px',
    color: 'var(--accent)',
    lineHeight: 1,
  },
  liveDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 6px var(--green)',
    marginLeft: '4px',
  },
  liveLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: '8px',
    color: 'var(--green)',
    letterSpacing: '0.12em',
  },
}

function Header() {
  const { lang, toggle } = useI18n()

  return (
    <header style={S.header}>
      <div style={S.logoWrap}>
        <span style={S.logoText}>Market Pulse</span>
        <span className="cursor-blink" style={S.cursor}>_</span>
        <div style={S.liveDot} />
        <span style={S.liveLabel}>LIVE</span>
      </div>

      <button
        onClick={toggle}
        style={{
          fontFamily: 'JetBrains Mono',
          fontSize: '9px',
          letterSpacing: '0.14em',
          color: 'var(--text-dim)',
          background: 'none',
          border: '1px solid var(--border-bright)',
          padding: '0.3rem 0.65rem',
          cursor: 'pointer',
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-dim)'
          e.currentTarget.style.borderColor = 'var(--border-bright)'
        }}
      >
        [{lang === 'zh' ? 'EN' : 'ZH'}]
      </button>
    </header>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />
        <main>
          <MarketPulse />
        </main>
      </div>
    </I18nProvider>
  )
}
