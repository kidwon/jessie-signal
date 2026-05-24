import { useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { I18nProvider, useI18n } from './i18n.jsx'
import { ThemeProvider, useTheme } from './theme.jsx'
import MarketPulse from './MarketPulse'

function Header() {
  const { lang, toggle: toggleLang, setLang } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()

  const btnStyle = {
    fontFamily: 'JetBrains Mono',
    fontSize: '9px',
    letterSpacing: '0.14em',
    color: 'var(--text-dim)',
    background: 'none',
    border: '1px solid var(--border-bright)',
    padding: '0.3rem 0.65rem',
    cursor: 'pointer',
    transition: 'color 0.2s, border-color 0.2s',
  }

  const hoverOn  = e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }
  const hoverOff = e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.6rem 1.25rem',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      transition: 'background 0.25s ease, border-color 0.25s ease',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {/* EKG mark */}
        <svg width="36" height="20" viewBox="0 0 36 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline
            points="1,10 7,10 10,2 13,18 15,4 17,10 23,10 35,10"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <span style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.22em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
          }}>
            Jessie Signal
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '7.5px',
            letterSpacing: '0.1em',
            color: 'var(--text-dim)',
            opacity: 0.55,
          }}>
            {{ zh: '市场情绪实时监控', en: 'Real-time Market Sentiment Monitor', ja: 'リアルタイム市場センチメント' }[lang]}
          </span>
        </div>
        <span className="cursor-blink" style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--accent)', lineHeight: 1 }}>_</span>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', marginLeft: '4px' }} />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.12em' }}>LIVE</span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button style={btnStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={toggleTheme}>
          {theme === 'dark' ? '[☀]' : '[☾]'}
        </button>
        {[{ code: 'zh', label: '中' }, { code: 'en', label: 'EN' }, { code: 'ja', label: '日' }].map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              ...btnStyle,
              color: lang === code ? 'var(--accent)' : 'var(--text-dim)',
              borderColor: lang === code ? 'var(--accent)' : 'var(--border-bright)',
            }}
            onMouseEnter={hoverOn}
            onMouseLeave={e => {
              if (lang !== code) hoverOff(e)
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}

function AppInner() {
  const { lang } = useI18n()
  const recordVisit = useMutation(api.visits.record)
  const visitStats = useQuery(api.visits.stats)

  useEffect(() => {
    recordVisit({ lang })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.25s ease' }}>
      <Header />
      <main>
        <MarketPulse />
      </main>
      <footer style={{
        padding: '0.75rem 1.25rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1.5rem',
      }}>
        {visitStats && (
          <>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              TODAY {visitStats.today}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              TOTAL {visitStats.total}
            </span>
          </>
        )}
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppInner />
      </I18nProvider>
    </ThemeProvider>
  )
}
