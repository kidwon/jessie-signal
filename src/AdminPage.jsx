import { useQuery } from 'convex/react'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { api } from '../convex/_generated/api'
import { clerkEnabled } from './clerk'
import { useI18n } from './i18n.jsx'
import { tr } from './lang.js'

const mono = 'JetBrains Mono'

function Notice({ children }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 1rem',
      fontFamily: mono,
      fontSize: '11px',
      letterSpacing: '0.15em',
      color: 'var(--text-dim)',
    }}>
      {children}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ flex: 1, border: '1px solid var(--border)', padding: '1.2rem 1.25rem' }}>
      <div style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: mono, fontSize: '32px', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

const cell = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid var(--border)',
  fontFamily: mono,
  fontSize: '11px',
  color: 'var(--text-dim)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}
const headCell = { ...cell, color: 'var(--text-muted)', letterSpacing: '0.1em' }

function AdminData({ lang }) {
  const stats = useQuery(api.visits.stats)
  const visits = useQuery(api.visits.listRecentVisits)

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label={tr(lang, { zh: '累计独立访客', en: 'Total Visitors', ja: '累計訪問者', fr: 'Visiteurs totaux', de: 'Besucher gesamt', ru: 'Всего посетителей' })}
          value={stats?.total}
        />
        <StatCard
          label={tr(lang, { zh: '今日独立访客', en: 'Today', ja: '本日', fr: "Aujourd'hui", de: 'Heute', ru: 'Сегодня' })}
          value={stats?.today}
        />
      </div>

      <div style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
        {tr(lang, {
          zh: '// 最近访问明细（最多 200 条）',
          en: '// RECENT VISITS (UP TO 200)',
          ja: '// 最近のアクセス（最大200件）',
          fr: "// VISITES RÉCENTES (JUSQU'À 200)",
          de: '// LETZTE BESUCHE (BIS ZU 200)',
          ru: '// НЕДАВНИЕ ВИЗИТЫ (ДО 200)',
        })}
      </div>

      {visits === undefined ? (
        <Notice>LOADING<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span></Notice>
      ) : (
        <div style={{ border: '1px solid var(--border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headCell}>TIME</th>
                <th style={headCell}>IP</th>
                <th style={headCell}>COUNTRY</th>
                <th style={headCell}>LANG</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v._id}>
                  <td style={cell}>{new Date(v.timestamp).toLocaleString()}</td>
                  <td style={{ ...cell, color: 'var(--text)' }}>{v.ip ?? '—'}</td>
                  <td style={cell}>{v.country ?? '—'}</td>
                  <td style={cell}>{v.lang ?? '—'}</td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr><td style={cell} colSpan={4}>—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// Renders admin content only after the backend confirms admin status. The
// listRecentVisits query is gated server-side too — this is defense in depth.
function AdminGate({ lang }) {
  const isAdmin = useQuery(api.visits.isAdmin)
  if (isAdmin === undefined) {
    return <Notice>CHECKING ACCESS<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span></Notice>
  }
  if (!isAdmin) {
    return <Notice>{tr(lang, { zh: '⚠ 无权限访问', en: '⚠ ACCESS DENIED', ja: '⚠ アクセス権限がありません', fr: '⚠ ACCÈS REFUSÉ', de: '⚠ ZUGRIFF VERWEIGERT', ru: '⚠ ДОСТУП ЗАПРЕЩЁН' })}</Notice>
  }
  return <AdminData lang={lang} />
}

export default function AdminPage() {
  const { lang } = useI18n()

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ margin: '0 0 2rem', fontFamily: 'Syne', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
        {tr(lang, { zh: '管理后台', en: 'Admin', ja: '管理画面', fr: 'Administration', de: 'Verwaltung', ru: 'Администрирование' })}
      </h1>

      {!clerkEnabled ? (
        <Notice>{tr(lang, { zh: '登录系统未启用', en: 'AUTH NOT CONFIGURED', ja: '認証が未設定です', fr: 'AUTH NON CONFIGURÉE', de: 'AUTH NICHT KONFIGURIERT', ru: 'АВТОРИЗАЦИЯ НЕ НАСТРОЕНА' })}</Notice>
      ) : (
        <>
          <SignedOut>
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.15em', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
                {tr(lang, { zh: '请先登录', en: 'PLEASE SIGN IN', ja: 'ログインしてください', fr: 'VEUILLEZ VOUS CONNECTER', de: 'BITTE ANMELDEN', ru: 'ПОЖАЛУЙСТА, ВОЙДИТЕ' })}
              </div>
              <SignInButton mode="modal">
                <button style={{
                  fontFamily: mono, fontSize: '10px', letterSpacing: '0.14em',
                  color: 'var(--text-dim)', background: 'none',
                  border: '1px solid var(--border-bright)', padding: '0.5rem 2rem', cursor: 'pointer',
                }}>
                  {tr(lang, { zh: '登录', en: 'SIGN IN', ja: 'ログイン', fr: 'CONNEXION', de: 'ANMELDEN', ru: 'ВОЙТИ' })}
                </button>
              </SignInButton>
            </div>
          </SignedOut>
          <SignedIn>
            <AdminGate lang={lang} />
          </SignedIn>
        </>
      )}
    </div>
  )
}
