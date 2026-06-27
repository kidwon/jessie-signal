import { useEffect, useState } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
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

const fmt = (ms) => (ms ? new Date(ms).toLocaleString() : '—')

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', margin: '2rem 0 0.8rem' }}>
      {children}
    </div>
  )
}

function DataTable({ headers, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{headers.map((h) => <th key={h} style={headCell}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// Target states an alert email can fire on. Scenario ids match convex META;
// fearGreed ids match label_en from convex/signals fgLabel().
const SCENARIOS = [
  { id: 0, zh: '平静', en: 'Calm' },
  { id: 1, zh: '正常调整', en: 'Normal Correction' },
  { id: 2, zh: '恐慌', en: 'Panic' },
  { id: 3, zh: '极度恐慌', en: 'Extreme Panic' },
  { id: 4, zh: '系统性风险', en: 'Systemic Risk' },
  { id: 5, zh: '极度贪婪', en: 'Extreme Greed' },
]
const FEAR_GREED = [
  { id: 'Extreme Fear', zh: '极度恐惧', en: 'Extreme Fear' },
  { id: 'Fear', zh: '恐惧', en: 'Fear' },
  { id: 'Neutral', zh: '中性', en: 'Neutral' },
  { id: 'Greed', zh: '贪婪', en: 'Greed' },
  { id: 'Extreme Greed', zh: '极度贪婪', en: 'Extreme Greed' },
]

function ToggleRow({ on, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
        padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)',
        background: 'none', cursor: 'pointer', textAlign: 'left',
        fontFamily: mono, fontSize: '11px', letterSpacing: '0.05em',
        color: on ? 'var(--text)' : 'var(--text-dim)',
      }}
    >
      <span style={{ color: on ? 'var(--accent)' : 'var(--text-dim)' }}>[{on ? '✓' : ' '}]</span>
      {label}
    </button>
  )
}

function AlertSettings({ lang }) {
  const settings = useQuery(api.settings.get)
  const update = useMutation(api.settings.update)
  const [scenarios, setScenarios] = useState(null)
  const [fearGreed, setFearGreed] = useState(null)

  useEffect(() => {
    if (settings) { setScenarios(settings.scenarios); setFearGreed(settings.fearGreed) }
  }, [settings])

  if (settings === undefined || scenarios === null || fearGreed === null) {
    return <Notice>LOADING<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span></Notice>
  }

  const toggleScenario = (id) => {
    const next = scenarios.includes(id) ? scenarios.filter((x) => x !== id) : [...scenarios, id]
    setScenarios(next)
    update({ scenarios: next, fearGreed })
  }
  const toggleFg = (id) => {
    const next = fearGreed.includes(id) ? fearGreed.filter((x) => x !== id) : [...fearGreed, id]
    setFearGreed(next)
    update({ scenarios, fearGreed: next })
  }

  return (
    <>
      <div style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 0.8rem', lineHeight: 1.6 }}>
        {tr(lang, {
          zh: '勾选「进入该状态时」发送邮件提醒。',
          en: 'Checked states fire an alert email when the market enters them.',
          ja: 'チェックした状態に「入った時」にメール通知を送信。',
          fr: "Les états cochés déclenchent un e-mail à l'entrée.",
          de: 'Markierte Zustände lösen beim Eintritt eine E-Mail aus.',
          ru: 'Отмеченные состояния отправляют письмо при входе.',
        })}
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', border: '1px solid var(--border)' }}>
          <div style={{ ...headCell, borderBottom: '1px solid var(--border)' }}>
            {tr(lang, { zh: '市场情景', en: 'SCENARIO', ja: '市場シナリオ', fr: 'SCÉNARIO', de: 'SZENARIO', ru: 'СЦЕНАРИЙ' })}
          </div>
          {SCENARIOS.map((s) => (
            <ToggleRow key={s.id} on={scenarios.includes(s.id)} label={tr(lang, s)} onClick={() => toggleScenario(s.id)} />
          ))}
        </div>
        <div style={{ flex: 1, minWidth: '240px', border: '1px solid var(--border)' }}>
          <div style={{ ...headCell, borderBottom: '1px solid var(--border)' }}>
            {tr(lang, { zh: '恐贪指数', en: 'FEAR & GREED', ja: '恐怖と強欲', fr: 'PEUR & AVIDITÉ', de: 'ANGST & GIER', ru: 'СТРАХ И ЖАДНОСТЬ' })}
          </div>
          {FEAR_GREED.map((f) => (
            <ToggleRow key={f.id} on={fearGreed.includes(f.id)} label={tr(lang, f)} onClick={() => toggleFg(f.id)} />
          ))}
        </div>
      </div>
    </>
  )
}

function AdminData({ lang }) {
  const stats = useQuery(api.visits.stats)
  const visits = useQuery(api.visits.listRecentVisits)
  const subscriptions = useQuery(api.subscriptions.listSubscriptions)
  const listUsers = useAction(api.users.listUsers)
  const [users, setUsers] = useState(null)
  useEffect(() => { listUsers().then(setUsers).catch(() => setUsers([])) }, [listUsers])

  const loading = <Notice>LOADING<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span></Notice>

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        <StatCard
          label={tr(lang, { zh: '累计独立访客', en: 'Total Visitors', ja: '累計訪問者', fr: 'Visiteurs totaux', de: 'Besucher gesamt', ru: 'Всего посетителей' })}
          value={stats?.total}
        />
        <StatCard
          label={tr(lang, { zh: '今日独立访客', en: 'Today', ja: '本日', fr: "Aujourd'hui", de: 'Heute', ru: 'Сегодня' })}
          value={stats?.today}
        />
      </div>

      {/* Alert settings */}
      <SectionLabel>
        {tr(lang, {
          zh: '// 邮件提醒设置',
          en: '// ALERT SETTINGS',
          ja: '// メール通知設定',
          fr: '// PARAMÈTRES D’ALERTE',
          de: '// ALARM-EINSTELLUNGEN',
          ru: '// НАСТРОЙКИ ОПОВЕЩЕНИЙ',
        })}
      </SectionLabel>
      <AlertSettings lang={lang} />

      {/* Signed-in users (live from Clerk) */}
      <SectionLabel>
        {tr(lang, {
          zh: `// 登录用户（${users?.length ?? '…'}）`,
          en: `// SIGNED-IN USERS (${users?.length ?? '…'})`,
          ja: `// ログインユーザー（${users?.length ?? '…'}）`,
          fr: `// UTILISATEURS (${users?.length ?? '…'})`,
          de: `// ANGEMELDETE NUTZER (${users?.length ?? '…'})`,
          ru: `// ПОЛЬЗОВАТЕЛИ (${users?.length ?? '…'})`,
        })}
      </SectionLabel>
      {users === null ? loading : (
        <DataTable headers={['EMAIL', 'NAME', 'LAST SIGN-IN']}>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ ...cell, color: 'var(--text)' }}>{u.email ?? '—'}</td>
              <td style={cell}>{u.name ?? '—'}</td>
              <td style={cell}>{fmt(u.lastSignInAt)}</td>
            </tr>
          ))}
          {users.length === 0 && <tr><td style={cell} colSpan={3}>—</td></tr>}
        </DataTable>
      )}

      {/* Alert subscribers */}
      <SectionLabel>
        {tr(lang, {
          zh: `// 订阅用户（${subscriptions?.length ?? '…'}）`,
          en: `// SUBSCRIBERS (${subscriptions?.length ?? '…'})`,
          ja: `// 購読者（${subscriptions?.length ?? '…'}）`,
          fr: `// ABONNÉS (${subscriptions?.length ?? '…'})`,
          de: `// ABONNENTEN (${subscriptions?.length ?? '…'})`,
          ru: `// ПОДПИСЧИКИ (${subscriptions?.length ?? '…'})`,
        })}
      </SectionLabel>
      {subscriptions === undefined ? loading : (
        <DataTable headers={['EMAIL', 'LANG', 'SINCE']}>
          {subscriptions.map((s) => (
            <tr key={s._id}>
              <td style={{ ...cell, color: 'var(--text)' }}>{s.email}</td>
              <td style={cell}>{s.lang ?? '—'}</td>
              <td style={cell}>{fmt(s.createdAt)}</td>
            </tr>
          ))}
          {subscriptions.length === 0 && <tr><td style={cell} colSpan={3}>—</td></tr>}
        </DataTable>
      )}

      {/* Recent visits */}
      <SectionLabel>
        {tr(lang, {
          zh: '// 最近访问明细（最多 200 条）',
          en: '// RECENT VISITS (UP TO 200)',
          ja: '// 最近のアクセス（最大200件）',
          fr: "// VISITES RÉCENTES (JUSQU'À 200)",
          de: '// LETZTE BESUCHE (BIS ZU 200)',
          ru: '// НЕДАВНИЕ ВИЗИТЫ (ДО 200)',
        })}
      </SectionLabel>
      {visits === undefined ? loading : (
        <DataTable headers={['TIME', 'IP', 'COUNTRY', 'LANG']}>
          {visits.map((v) => (
            <tr key={v._id}>
              <td style={cell}>{fmt(v.timestamp)}</td>
              <td style={{ ...cell, color: 'var(--text)' }}>{v.ip ?? '—'}</td>
              <td style={cell}>{v.country ?? '—'}</td>
              <td style={cell}>{v.lang ?? '—'}</td>
            </tr>
          ))}
          {visits.length === 0 && <tr><td style={cell} colSpan={4}>—</td></tr>}
        </DataTable>
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
