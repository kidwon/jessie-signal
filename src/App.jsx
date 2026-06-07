import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { api } from '../convex/_generated/api'
import { clerkEnabled } from './clerk'
import { I18nProvider, useI18n } from './i18n.jsx'
import { tr, LANGS, LANG_LABELS } from './lang.js'
import { ThemeProvider, useTheme } from './theme.jsx'
import MarketPulse from './MarketPulse'
import AdminPage from './AdminPage'

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

// Custom language dropdown styled to match the page (native <select> popups
// can't be themed, especially on mobile).
function LangDropdown() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {LANG_LABELS[lang]}
        <span style={{ fontSize: '6px', lineHeight: 1, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '128px',
            background: 'var(--surface)',
            border: '1px solid var(--border-bright)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          }}
        >
          {LANGS.map((code, i) => {
            const active = code === lang
            return (
              <button
                key={code}
                role="option"
                aria-selected={active}
                onClick={() => { setLang(code); setOpen(false) }}
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  textAlign: 'left',
                  padding: '0.55rem 0.8rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: i < LANGS.length - 1 ? '1px solid var(--border)' : 'none',
                  color: active ? 'var(--accent)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-dim)' }}
              >
                {active ? '› ' : '  '}{LANG_LABELS[code]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Sign in / user button — rendered only when Clerk is configured. Lives in the
// footer so it never crowds the header on mobile.
function AuthControls() {
  const { lang } = useI18n()
  if (!clerkEnabled) return null
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button style={{ ...btnStyle, minWidth: '140px' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            {tr(lang, { zh: '登录', en: 'SIGN IN', ja: 'ログイン', fr: 'CONNEXION', de: 'ANMELDEN', ru: 'ВОЙТИ' })}
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  )
}

// Scenario-alert subscribe toggle — only for signed-in users (the login-gated
// feature). Reads/writes the subscriptions table via auth-scoped functions.
function SubscribeToggle() {
  const { lang } = useI18n()
  const sub = useQuery(api.subscriptions.mySubscription)
  const subscribe = useMutation(api.subscriptions.subscribe)
  const unsubscribe = useMutation(api.subscriptions.unsubscribe)
  if (sub === undefined) return null
  return (
    <button
      style={{ ...btnStyle, color: sub ? 'var(--accent)' : 'var(--text-dim)', borderColor: sub ? 'var(--accent)' : 'var(--border-bright)' }}
      onMouseEnter={hoverOn}
      onMouseLeave={e => { if (!sub) hoverOff(e) }}
      onClick={() => { (sub ? unsubscribe() : subscribe({ lang })).catch(() => {}) }}
    >
      {sub
        ? tr(lang, { zh: '🔔 已订阅', en: '🔔 SUBSCRIBED', ja: '🔔 通知オン', fr: '🔔 ABONNÉ', de: '🔔 ABONNIERT', ru: '🔔 ПОДПИСАН' })
        : tr(lang, { zh: '🔔 订阅提醒', en: '🔔 ALERTS', ja: '🔔 通知', fr: '🔔 ALERTES', de: '🔔 ALARME', ru: '🔔 ОПОВЕЩ.' })}
    </button>
  )
}

// Bottom-of-page controls: admin entry (admins only) + alert subscribe + auth.
function FooterControls() {
  const isAdmin = useQuery(api.visits.isAdmin)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {isAdmin && (
        <Link
          to="/admin"
          style={{
            ...btnStyle,
            color: 'var(--accent)',
            borderColor: 'var(--accent)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '140px',
          }}
        >
          ADMIN
        </Link>
      )}
      <SignedIn>
        <SubscribeToggle />
      </SignedIn>
      <AuthControls />
    </div>
  )
}

function Header() {
  const { lang } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()

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
      {/* Logo — links home */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
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
            {tr(lang, {
              zh: '市场情绪实时监控',
              en: 'Real-time Market Sentiment Monitor',
              ja: 'リアルタイム市場センチメント',
              fr: 'Suivi du sentiment de marché en temps réel',
              de: 'Echtzeit-Marktstimmungs-Monitor',
              ru: 'Мониторинг настроений рынка в реальном времени',
            })}
          </span>
        </div>
        <span className="cursor-blink" style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--accent)', lineHeight: 1 }}>_</span>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', marginLeft: '4px' }} />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.12em' }}>LIVE</span>
      </Link>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button style={btnStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={toggleTheme}>
          {theme === 'dark' ? '[☀]' : '[☾]'}
        </button>
        <LangDropdown />
      </div>
    </header>
  )
}

function Layout({ children }) {
  const { lang } = useI18n()

  useEffect(() => {
    // Hit the HTTP action so Convex can read the real client IP and dedupe
    // per IP per day. (.convex.cloud serves functions, .convex.site serves
    // HTTP actions.)
    const httpUrl = import.meta.env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site')
    fetch(`${httpUrl}/api/visit?lang=${lang}`, { method: 'POST' }).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.25s ease' }}>
      <Header />
      <main>
        {children}
      </main>
      <footer style={{
        padding: '0.75rem 1.25rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <FooterControls />
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><MarketPulse /></Layout>} />
            <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  )
}
