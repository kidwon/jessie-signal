import { useState, useEffect, useRef, useCallback } from 'react'
import { useAction } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useI18n } from './i18n.jsx'

const CACHE_TTL = 5 * 60 * 1000

// ─── Animated number count-up ───────────────────────────────────────────────
function useAnimatedNumber(target, decimals = 1, duration = 900) {
  const [display, setDisplay] = useState(null)
  const raf = useRef(null)

  useEffect(() => {
    if (target == null) return
    const t0 = Date.now()
    const to = Number(target)
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setDisplay((to * eased).toFixed(decimals))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setDisplay(to.toFixed(decimals))
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, decimals, duration])

  return display
}

// ─── Data ────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    num: 0,
    short_zh: '不明', short_en: 'UNK',
    name_zh: '信号不明', name_en: 'UNCLEAR',
    cond_zh: 'VIX 处于中间区间，恐贪指数未达极端',
    cond_en: 'VIX in middle range, F&G not at extremes',
    action_zh: '等待更清晰的信号，保持观望。',
    action_en: 'Wait for clearer signals. Stay on the sidelines.',
    color: '#8888aa', glow: 'rgba(136,136,170,0.25)',
  },
  {
    num: 1,
    short_zh: '调整', short_en: 'COR',
    name_zh: '正常调整', name_en: 'CORRECTION',
    cond_zh: 'VIX 18–25，市场有所波动但未进入恐慌',
    cond_en: 'VIX 18–25, elevated but not panic territory',
    action_zh: '维持标准定投节奏，不必恐慌，也不必激进抄底。',
    action_en: 'Maintain standard DCA. No need to panic or aggressively buy the dip.',
    color: '#5b9cf6', glow: 'rgba(91,156,246,0.25)',
  },
  {
    num: 2,
    short_zh: '恐慌', short_en: 'PAN',
    name_zh: '恐慌', name_en: 'PANIC',
    cond_zh: 'VIX 25–35，恐贪指数 < 25，信用市场尚稳',
    cond_en: 'VIX 25–35, F&G < 25, credit markets stable',
    action_zh: '分批建仓：先投 30%，VIX 触 30 再加 30%，VIX 破 40 或回落时投入剩余 40%。',
    action_en: 'Tranche-based buying: deploy 30% now, +30% at VIX 30, final 40% when VIX breaks 40 or rolls over.',
    color: '#f0b429', glow: 'rgba(240,180,41,0.25)',
  },
  {
    num: 3,
    short_zh: '极恐', short_en: 'EXT',
    name_zh: '极度恐慌', name_en: 'EXTREME PANIC',
    cond_zh: 'VIX ≥ 35，恐贪指数 < 15，信用市场无明显压力',
    cond_en: 'VIX ≥ 35, F&G < 15, no significant credit stress',
    action_zh: '积极布局优质核心资产，始终保留部分现金，切勿一次性全仓。',
    action_en: 'Aggressively target quality assets. Always preserve some cash — never go all-in at once.',
    color: '#0fd4a0', glow: 'rgba(15,212,160,0.25)',
  },
  {
    num: 4,
    short_zh: '系统', short_en: 'SYS',
    name_zh: '系统性风险', name_en: 'SYSTEMIC RISK',
    cond_zh: 'VIX ≥ 30 且信用市场承压（HYG 或 JNK 单日跌幅 > 1.5%）',
    cond_en: 'VIX ≥ 30 AND credit stress (HYG or JNK down > 1.5%)',
    action_zh: '绝对不要急于抄底。降低杠杆，减持高 Beta 股，储备现金，等待信用市场企稳。',
    action_en: 'Do not rush to buy the dip. Reduce leverage, cut high-beta stocks, stockpile cash, wait for credit markets to stabilize.',
    color: '#f0485a', glow: 'rgba(240,72,90,0.25)',
  },
  {
    num: 5,
    short_zh: '极贪', short_en: 'GRD',
    name_zh: '极度贪婪', name_en: 'EXTREME GREED',
    cond_zh: 'VIX < 18 且恐贪指数 > 75，市场过热',
    cond_en: 'VIX < 18 AND F&G > 75, market overheated',
    action_zh: '市场估值已拉伸。逐步减仓，轮换至防御性资产，可考虑 Covered Call 锁定收益。',
    action_en: 'Valuations are stretched. Scale back exposure, rotate defensive, write Covered Calls.',
    color: '#c084fc', glow: 'rgba(192,132,252,0.25)',
  },
]

// ─── Scenario track ───────────────────────────────────────────────────────────
function ScenarioTrack({ activeNum, lang }) {
  const [preview, setPreview] = useState(null)
  const shown = preview !== null ? preview : activeNum
  const shownS = SCENARIOS.find(s => s.num === shown)
  const isPreview = preview !== null && preview !== activeNum

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Nodes row */}
      <div style={{ position: 'relative', display: 'flex', padding: '1.25rem 0 0.6rem' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: 'calc(1.25rem + 5px)',
          left: 'calc(100% / 12)',
          right: 'calc(100% / 12)',
          height: '1px',
          background: 'var(--border-mid)',
        }} />

        {SCENARIOS.map(s => {
          const isActive  = s.num === activeNum
          const isPrev    = s.num === preview
          const sz        = isActive ? 12 : isPrev ? 10 : 7

          return (
            <div
              key={s.num}
              onClick={() => setPreview(isPrev ? null : s.num)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                width: sz, height: sz,
                borderRadius: '50%',
                background: isActive ? s.color : isPrev ? s.color + 'aa' : 'var(--border-bright)',
                boxShadow: isActive
                  ? `0 0 8px ${s.glow}, 0 0 18px ${s.glow}`
                  : isPrev ? `0 0 5px ${s.glow}` : 'none',
                border: isActive ? `1.5px solid ${s.color}` : 'none',
                transition: 'all 0.22s ease',
              }} />
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '8px',
                letterSpacing: '0.04em',
                textAlign: 'center',
                color: isActive ? s.color : isPrev ? s.color + 'cc' : 'var(--text-muted)',
                lineHeight: 1.3,
                fontWeight: isActive ? 500 : 400,
                transition: 'color 0.22s ease',
                userSelect: 'none',
              }}>
                {lang === 'zh' ? s.short_zh : s.short_en}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {shownS && (
        <div
          key={shown}
          className="fade-up"
          style={{
            marginTop: '0.75rem',
            borderLeft: `3px solid ${shownS.color}`,
            background: shownS.color + '0e',
            padding: '1rem 1.1rem',
          }}
        >
          {/* Scenario name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
            <span style={{
              fontFamily: 'Syne',
              fontSize: '16px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: shownS.color,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {lang === 'zh' ? shownS.name_zh : shownS.name_en}
            </span>
            {isPreview && (
              <span style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '8px',
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                border: '1px solid var(--border-bright)',
                padding: '1px 5px',
              }}>
                {lang === 'zh' ? 'PREVIEW' : 'PREVIEW'}
              </span>
            )}
          </div>

          <div
            className="scenario-detail-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}
          >
            {[
              { key: '// CONDITION', zh: shownS.cond_zh,   en: shownS.cond_en,   dimText: true },
              { key: '// ACTION',    zh: shownS.action_zh, en: shownS.action_en, dimText: false },
            ].map(({ key, zh, en, dimText }) => (
              <div key={key}>
                <div style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '8px',
                  letterSpacing: '0.14em',
                  color: shownS.color + 'aa',
                  marginBottom: '0.35rem',
                }}>
                  {key}
                </div>
                <p style={{
                  margin: 0,
                  fontFamily: 'Syne',
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: dimText ? 'var(--text-dim)' : 'var(--text)',
                }}>
                  {lang === 'zh' ? zh : en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono',
      fontSize: '8px',
      letterSpacing: '0.2em',
      color: 'var(--text-dim)',
      marginBottom: '1.1rem',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function BigNumber({ value, decimals = 1, duration = 900 }) {
  const animated = useAnimatedNumber(value, decimals, duration)
  return (
    <span style={{
      fontFamily: 'JetBrains Mono',
      fontSize: 'clamp(40px, 8vw, 56px)',
      fontWeight: 300,
      color: 'var(--text)',
      lineHeight: 1,
      letterSpacing: '-0.02em',
    }}>
      {animated ?? '—'}
    </span>
  )
}

function StatusLabel({ children, color }) {
  return (
    <span style={{
      fontFamily: 'Syne',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.12em',
      color,
      textTransform: 'uppercase',
      alignSelf: 'flex-end',
      paddingBottom: '0.4rem',
    }}>
      {children}
    </span>
  )
}

function RulerBar({ pct, color, ticks }) {
  return (
    <div style={{ paddingTop: '0.8rem' }}>
      <div style={{ height: '2px', background: 'var(--border-mid)', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: 0, top: 0,
          height: '100%',
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 8px ${color}88`,
          transition: 'width 0.9s ease',
        }} />
        {ticks.map(t => (
          <div key={t} style={{
            position: 'absolute',
            left: `${t}%`,
            top: '-3px',
            width: '1px',
            height: '8px',
            background: 'var(--border-bright)',
          }} />
        ))}
      </div>
    </div>
  )
}

function TickLabels({ labels }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
      {labels.map(l => (
        <span key={l} style={{
          fontFamily: 'JetBrains Mono',
          fontSize: '7px',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
        }}>{l}</span>
      ))}
    </div>
  )
}

function ChgBadge({ value }) {
  if (value == null) return (
    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
  )
  const n = Number(value)
  const color = n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--text-dim)'
  const bg    = n > 0 ? 'var(--green-dim)' : n < 0 ? 'var(--red-dim)' : 'transparent'
  return (
    <span style={{
      fontFamily: 'JetBrains Mono',
      fontSize: '12px',
      fontWeight: 500,
      color,
      background: bg,
      padding: '1px 5px',
      letterSpacing: '0.02em',
    }}>
      {n >= 0 ? '+' : ''}{n.toFixed(2)}%
    </span>
  )
}

function EtfRow({ ticker, sublabel, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.35rem 0',
    }}>
      <div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 500, color: 'var(--text)', letterSpacing: '0.05em' }}>
          {ticker}
        </span>
        {sublabel && (
          <span style={{ fontFamily: 'Syne', fontSize: '10px', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            {sublabel}
          </span>
        )}
      </div>
      <ChgBadge value={value} />
    </div>
  )
}

// Cell wrapper — handles internal grid borders
function Cell({ children, borderRight, borderBottom, colSpan }) {
  return (
    <div
      className={borderRight ? 'cell-border-r' : ''}
      style={{
        padding: '1.4rem 1.25rem',
        borderRight:  borderRight  ? '1px solid var(--border)' : undefined,
        borderBottom: borderBottom ? '1px solid var(--border)' : undefined,
        gridColumn:   colSpan ? '1 / -1' : undefined,
      }}
    >
      {children}
    </div>
  )
}

// ─── Metric cards ─────────────────────────────────────────────────────────────
function VIXCard({ vix, lang }) {
  if (!vix) return null
  const v = vix.value
  const label = lang === 'zh' ? vix.label_zh : vix.label_en
  const pct   = Math.min(100, Math.max(0, ((v - 10) / 50) * 100))
  const color = v < 18 ? 'var(--green)' : v < 25 ? 'var(--accent)' : v < 30 ? '#f97316' : 'var(--red)'

  return (
    <Cell borderRight borderBottom>
      <Label>VIX / Volatility Index</Label>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
        <BigNumber value={v} decimals={1} />
        <StatusLabel color={color}>{label}</StatusLabel>
      </div>
      <RulerBar pct={pct} color={color} ticks={[4, 16, 30, 40, 60]} />
      <TickLabels labels={['12', '18', '25', '30', '40+']} />
    </Cell>
  )
}

function FGCard({ fg, lang }) {
  if (!fg) return null
  const score = fg.score
  const label = lang === 'zh' ? fg.label_zh : fg.label_en
  const pct   = score != null ? Math.min(100, Math.max(0, score)) : 50
  const color = score < 25 ? 'var(--red)' : score < 45 ? '#f97316' : score < 55 ? 'var(--text-dim)' : score < 75 ? 'var(--accent)' : 'var(--green)'

  return (
    <Cell borderBottom>
      <Label>Fear &amp; Greed / {lang === 'zh' ? '恐贪指数' : 'Sentiment'}</Label>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
        <BigNumber value={score} decimals={0} duration={1100} />
        <StatusLabel color={color}>{label}</StatusLabel>
      </div>
      <RulerBar pct={pct} color={color} ticks={[25, 50, 75]} />
      <TickLabels labels={['0', '25', '50', '75', '100']} />
    </Cell>
  )
}

function BreadthCard({ breadth, lang }) {
  if (!breadth) return null
  const div      = breadth.divergence
  const divColor = div < -1 ? 'var(--red)' : div < 0 ? 'var(--accent)' : 'var(--green)'

  return (
    <Cell borderRight>
      <Label>Breadth / {lang === 'zh' ? '市场广度' : 'Market Breadth'}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <EtfRow ticker="SPY" sublabel={lang === 'zh' ? '市值加权' : 'cap-wtd'} value={breadth.spy_chg} />
        <EtfRow ticker="RSP" sublabel={lang === 'zh' ? '等权重'   : 'eq-wtd'}  value={breadth.rsp_chg} />
        <EtfRow ticker="IWM" sublabel={lang === 'zh' ? '小盘股'   : 'sm-cap'}  value={breadth.iwm_chg} />
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {lang === 'zh' ? 'RSP−SPY 分化度' : 'RSP−SPY Spread'}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 500, color: divColor }}>
            {div >= 0 ? '+' : ''}{Number(div).toFixed(2)}%
          </span>
        </div>
      </div>
    </Cell>
  )
}

function CreditCard({ credit, lang }) {
  if (!credit) return null
  const ok = !credit.stress

  return (
    <Cell>
      <Label>Credit / {lang === 'zh' ? '信用市场' : 'Credit Markets'}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: '0.9rem' }}>
        <EtfRow ticker="HYG" sublabel={lang === 'zh' ? '高收益债' : 'Hi-Yield'} value={credit.hyg_chg} />
        <EtfRow ticker="JNK" sublabel={lang === 'zh' ? '高收益债' : 'Hi-Yield'} value={credit.jnk_chg} />
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono',
        fontSize: '8px',
        letterSpacing: '0.08em',
        padding: '0.45rem 0.7rem',
        borderLeft: `2px solid ${ok ? 'var(--green)' : 'var(--red)'}`,
        color: ok ? 'var(--green)' : 'var(--red)',
        background: ok ? 'var(--green-dim)' : 'var(--red-dim)',
        lineHeight: 1.6,
      }}>
        {ok
          ? (lang === 'zh' ? '// 信用市场正常' : '// CREDIT STABLE')
          : (lang === 'zh' ? '⚠ 信用市场承压，谨慎抄底' : '⚠ CREDIT STRESS — CAUTION')}
      </div>
    </Cell>
  )
}

function CrossAssetCard({ ca, lang }) {
  if (!ca) return null

  return (
    <Cell colSpan style={{ borderTop: '1px solid var(--border)' }}>
      <Label>Cross-Asset / {lang === 'zh' ? '跨资产' : 'Multi-Asset'}</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.9rem' }}>
        {[
          { ticker: 'TLT', sub: lang === 'zh' ? '美国长债' : 'US LT Bonds', v: ca.tlt_chg },
          { ticker: 'GLD', sub: lang === 'zh' ? '黄金'     : 'Gold',         v: ca.gld_chg },
          { ticker: 'UUP', sub: lang === 'zh' ? '美元指数' : 'USD Index',    v: ca.uup_chg },
        ].map(({ ticker, sub, v }) => (
          <div key={ticker}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 500, color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{ticker}</div>
            <div style={{ fontFamily: 'Syne', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{sub}</div>
            <ChgBadge value={v} />
          </div>
        ))}
      </div>
      {ca.notes?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {ca.notes.map((n, i) => (
            <p key={i} style={{ margin: 0, fontFamily: 'Syne', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.55 }}>
              <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginRight: '0.4rem' }}>//</span>
              {lang === 'zh' ? n.zh : n.en}
            </p>
          ))}
        </div>
      )}
    </Cell>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function MarketPulse() {
  const { lang }      = useI18n()
  const getSignals    = useAction(api.signals.get)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const cacheRef = useRef({ ts: 0, data: null })

  const load = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && cacheRef.current.data && now - cacheRef.current.ts < CACHE_TTL) {
      setData(cacheRef.current.data)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await getSignals({})
      cacheRef.current = { ts: now, data: result }
      setData(result)
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Failed to load signals', e)
    } finally {
      setLoading(false)
    }
  }, [getSignals])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Syne', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {lang === 'zh' ? 'Jessie Signal' : 'Jessie Signal'}
          </h1>
          {lastUpdate && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '0.12em', marginTop: '0.3rem' }}>
              {lang === 'zh' ? '更新于' : 'UPDATED'}{' '}
              {lastUpdate.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US')}
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.6rem' }}>· 5MIN CACHE</span>
            </div>
          )}
        </div>
        <button
          onClick={() => load(true)}
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '8px',
            letterSpacing: '0.16em',
            color: 'var(--text-dim)',
            background: 'none',
            border: '1px solid var(--border-bright)',
            padding: '0.4rem 0.8rem',
            cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
        >
          {lang === 'zh' ? '刷新' : 'REFRESH'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
          LOADING<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span>
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.2em' }}>
          ERR: FAILED TO LOAD
        </div>
      ) : (
        <>
          <ScenarioTrack activeNum={data.scenario?.scenario} lang={lang} />

          {/* Metrics grid */}
          <div
            className="metrics-grid fade-up"
            style={{
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            <VIXCard    vix={data.vix}          lang={lang} />
            <FGCard     fg={data.fear_greed}    lang={lang} />
            <BreadthCard breadth={data.breadth} lang={lang} />
            <CreditCard credit={data.credit}    lang={lang} />
            <CrossAssetCard ca={data.cross_asset} lang={lang} />
          </div>

          <p style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '7px',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textAlign: 'center',
            marginTop: '1.5rem',
            lineHeight: 1.7,
          }}>
            {lang === 'zh'
              ? '// 情景分类基于阈值自动推断 · 仅供参考 · 不构成投资建议'
              : '// SCENARIO CLASSIFICATION IS AUTO-DERIVED · FOR REFERENCE ONLY · NOT INVESTMENT ADVICE'}
          </p>
        </>
      )}
    </div>
  )
}
