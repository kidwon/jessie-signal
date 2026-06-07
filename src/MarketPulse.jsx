import { useState, useEffect, useRef } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useI18n } from './i18n.jsx'
import { tr } from './lang.js'

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

// ─── Locale for date formatting ──────────────────────────────────────────────
const DATE_LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', de: 'de-DE', ru: 'ru-RU' }

// ─── Data ────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    num: 0,
    short: { zh: '平静', en: 'CALM', ja: '平穏', fr: 'CALME', de: 'RUHIG', ru: 'ШТИЛЬ' },
    name: { zh: '市场平静', en: 'CALM', ja: '市場は平穏', fr: 'MARCHÉ CALME', de: 'RUHIGER MARKT', ru: 'СПОКОЙНЫЙ РЫНОК' },
    cond: {
      zh: 'VIX < 18，市场平静，情绪未达极端',
      en: 'VIX < 18, market calm, sentiment not at extremes',
      ja: 'VIX < 18、市場は平穏でセンチメントも極端でない',
      fr: 'VIX < 18, marché calme, sentiment sans extrême',
      de: 'VIX < 18, ruhiger Markt, keine Extreme',
      ru: 'VIX < 18, рынок спокоен, настроения без крайностей',
    },
    action: {
      zh: '市场平静，无需特别操作，按计划持有或定投即可。',
      en: 'Market is calm. No special action — hold or stick to your DCA plan.',
      ja: '市場は平穏。特別な操作は不要、保有または積立を継続。',
      fr: 'Marché calme. Aucune action particulière — conservez ou poursuivez vos versements programmés.',
      de: 'Ruhiger Markt. Keine besondere Aktion — halten oder Sparplan fortsetzen.',
      ru: 'Рынок спокоен. Особых действий не нужно — держите или продолжайте регулярные покупки.',
    },
    color: '#8888aa', glow: 'rgba(136,136,170,0.25)',
  },
  {
    num: 1,
    short: { zh: '调整', en: 'COR', ja: '調整', fr: 'CORR', de: 'KORR', ru: 'КОРР' },
    name: { zh: '正常调整', en: 'CORRECTION', ja: '通常調整', fr: 'CORRECTION', de: 'KORREKTUR', ru: 'КОРРЕКЦИЯ' },
    cond: {
      zh: 'VIX 18–25，市场有所波动但未进入恐慌',
      en: 'VIX 18–25, elevated but not panic territory',
      ja: 'VIX 18–25、変動はあるがパニックには至っていない',
      fr: 'VIX 18–25, tension élevée mais pas de panique',
      de: 'VIX 18–25, erhöht aber keine Panik',
      ru: 'VIX 18–25, повышенная волатильность, но не паника',
    },
    action: {
      zh: '维持标准定投节奏，不必恐慌，也不必激进抄底。',
      en: 'Maintain standard DCA. No need to panic or aggressively buy the dip.',
      ja: '通常の積立ペースを維持。パニックも強引な押し目買いも不要です。',
      fr: 'Maintenez vos versements réguliers. Ni panique, ni achat agressif du creux.',
      de: 'Standard-Sparplan beibehalten. Keine Panik, kein aggressives Nachkaufen.',
      ru: 'Сохраняйте обычный план усреднения. Без паники и агрессивных покупок просадки.',
    },
    color: '#5b9cf6', glow: 'rgba(91,156,246,0.25)',
  },
  {
    num: 2,
    short: { zh: '恐慌', en: 'PAN', ja: 'パニック', fr: 'PANIQUE', de: 'PANIK', ru: 'ПАНИКА' },
    name: { zh: '恐慌', en: 'PANIC', ja: 'パニック', fr: 'PANIQUE', de: 'PANIK', ru: 'ПАНИКА' },
    cond: {
      zh: 'VIX ≥ 30，或 VIX 25–35 且恐贪指数 < 25，信用市场尚稳',
      en: 'VIX ≥ 30, or VIX 25–35 with F&G < 25, credit still stable',
      ja: 'VIX ≥ 30、または VIX 25–35 かつ恐怖指数 < 25、信用市場は安定',
      fr: 'VIX ≥ 30, ou VIX 25–35 avec F&G < 25, crédit encore stable',
      de: 'VIX ≥ 30, oder VIX 25–35 mit F&G < 25, Kredit noch stabil',
      ru: 'VIX ≥ 30, или VIX 25–35 при F&G < 25, кредит стабилен',
    },
    action: {
      zh: '分批建仓：先投 30%，VIX 触 30 再加 30%，VIX 破 40 或回落时投入剩余 40%。',
      en: 'Tranche-based buying: deploy 30% now, +30% at VIX 30, final 40% when VIX breaks 40 or rolls over.',
      ja: '分割投資：まず30%、VIX30で+30%、VIX40超または反転時に残り40%を投入。',
      fr: 'Achat par tranches : 30 % maintenant, +30 % à VIX 30, 40 % restants quand le VIX dépasse 40 ou reflue.',
      de: 'Tranchenkauf: jetzt 30 %, +30 % bei VIX 30, restliche 40 % bei VIX über 40 oder Rückgang.',
      ru: 'Покупка траншами: 30 % сейчас, +30 % при VIX 30, оставшиеся 40 % при пробое VIX 40 или развороте.',
    },
    color: '#f0b429', glow: 'rgba(240,180,41,0.25)',
  },
  {
    num: 3,
    short: { zh: '极恐', en: 'EXT', ja: '極恐慌', fr: 'EXTRÊME', de: 'EXTREM', ru: 'ЭКСТР' },
    name: { zh: '极度恐慌', en: 'EXTREME PANIC', ja: '極度パニック', fr: 'PANIQUE EXTRÊME', de: 'EXTREME PANIK', ru: 'КРАЙНЯЯ ПАНИКА' },
    cond: {
      zh: 'VIX ≥ 35，恐贪指数 < 15，信用市场无明显压力',
      en: 'VIX ≥ 35, F&G < 15, no significant credit stress',
      ja: 'VIX ≥ 35、恐怖指数 < 15、信用市場に大きな圧力なし',
      fr: 'VIX ≥ 35, F&G < 15, pas de stress de crédit notable',
      de: 'VIX ≥ 35, F&G < 15, kein nennenswerter Kreditstress',
      ru: 'VIX ≥ 35, индекс < 15, без значимого кредитного стресса',
    },
    action: {
      zh: '积极布局优质核心资产，始终保留部分现金，切勿一次性全仓。',
      en: 'Aggressively target quality assets. Always preserve some cash — never go all-in at once.',
      ja: '優良コア資産を積極的に仕込む。常に一部現金を確保し、一括投資は禁物。',
      fr: "Visez activement les actifs de qualité. Gardez toujours du cash — jamais tout d'un coup.",
      de: 'Aktiv Qualitätswerte aufbauen. Stets etwas Cash halten — nie alles auf einmal.',
      ru: 'Активно набирайте качественные активы. Всегда держите часть в кэше — не входите на всё сразу.',
    },
    color: '#0fd4a0', glow: 'rgba(15,212,160,0.25)',
  },
  {
    num: 4,
    short: { zh: '系统', en: 'SYS', ja: 'システム', fr: 'SYST', de: 'SYS', ru: 'СИСТ' },
    name: { zh: '系统性风险', en: 'SYSTEMIC RISK', ja: 'システミックリスク', fr: 'RISQUE SYSTÉMIQUE', de: 'SYSTEMRISIKO', ru: 'СИСТЕМНЫЙ РИСК' },
    cond: {
      zh: 'VIX ≥ 30 且信用市场承压（HYG 或 JNK 单日跌幅 > 1.5%）',
      en: 'VIX ≥ 30 AND credit stress (HYG or JNK down > 1.5%)',
      ja: 'VIX ≥ 30 かつ信用市場に圧力（HYGまたはJNKが1.5%超下落）',
      fr: 'VIX ≥ 30 ET stress de crédit (HYG ou JNK en baisse > 1,5 %)',
      de: 'VIX ≥ 30 UND Kreditstress (HYG oder JNK über 1,5 % gefallen)',
      ru: 'VIX ≥ 30 И кредитный стресс (HYG или JNK падают > 1,5 %)',
    },
    action: {
      zh: '绝对不要急于抄底。降低杠杆，减持高 Beta 股，储备现金，等待信用市场企稳。',
      en: 'Do not rush to buy the dip. Reduce leverage, cut high-beta stocks, stockpile cash, wait for credit markets to stabilize.',
      ja: '押し目買いを急がないこと。レバレッジ縮小、高ベータ株削減、現金確保、信用市場の安定を待つ。',
      fr: 'Ne vous précipitez pas sur le creux. Réduisez le levier, allégez les valeurs à bêta élevé, constituez du cash, attendez la stabilisation du crédit.',
      de: 'Nicht überstürzt nachkaufen. Hebel reduzieren, High-Beta-Aktien abbauen, Cash aufbauen, auf Stabilisierung der Kreditmärkte warten.',
      ru: 'Не спешите откупать просадку. Снизьте плечо, сократите высокобета-акции, накапливайте кэш, ждите стабилизации кредитного рынка.',
    },
    color: '#f0485a', glow: 'rgba(240,72,90,0.25)',
  },
  {
    num: 5,
    short: { zh: '极贪', en: 'GRD', ja: '過熱', fr: 'CUPID', de: 'GIER', ru: 'ЖАДН' },
    name: { zh: '极度贪婪', en: 'EXTREME GREED', ja: '極度の過熱', fr: 'CUPIDITÉ EXTRÊME', de: 'EXTREME GIER', ru: 'КРАЙНЯЯ ЖАДНОСТЬ' },
    cond: {
      zh: 'VIX < 18 且恐贪指数 > 75，市场过热',
      en: 'VIX < 18 AND F&G > 75, market overheated',
      ja: 'VIX < 18 かつ恐怖指数 > 75、市場過熱',
      fr: 'VIX < 18 ET F&G > 75, marché en surchauffe',
      de: 'VIX < 18 UND F&G > 75, Markt überhitzt',
      ru: 'VIX < 18 И F&G > 75, рынок перегрет',
    },
    action: {
      zh: '市场估值已拉伸。逐步减仓，轮换至防御性资产，可考虑 Covered Call 锁定收益。',
      en: 'Valuations are stretched. Scale back exposure, rotate defensive, write Covered Calls.',
      ja: 'バリュエーションは割高。ポジション縮小、ディフェンシブへ転換、カバードコールを検討。',
      fr: "Valorisations tendues. Réduisez l'exposition, basculez vers le défensif, vendez des Covered Calls.",
      de: 'Bewertungen überdehnt. Engagement reduzieren, defensiv umschichten, Covered Calls schreiben.',
      ru: 'Оценки завышены. Сокращайте позиции, переходите в защитные активы, продавайте Covered Calls.',
    },
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
                {tr(lang, s.short)}
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
              {tr(lang, shownS.name)}
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
                PREVIEW
              </span>
            )}
          </div>

          <div
            className="scenario-detail-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}
          >
            {[
              { key: '// CONDITION', text: shownS.cond,   dimText: true },
              { key: '// ACTION',    text: shownS.action, dimText: false },
            ].map(({ key, text, dimText }) => (
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
                  {tr(lang, text)}
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

// Inline SVG trend line. Returns null until there are ≥2 points.
function Sparkline({ data, color, label, width = 104, height = 26 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1
    const y = height - 1 - ((v - min) / (range)) * (height - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const [lx, ly] = pts[pts.length - 1].split(',')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
        <circle cx={lx} cy={ly} r="1.8" fill={color} />
      </svg>
      {label && (
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{label}</span>
      )}
    </div>
  )
}

// VIX roll-over: peaked in panic territory (≥30) within the recent window and
// has since declined ≥10%. The guide's key bottom-confirmation signal — only
// possible with history, not a single snapshot.
function detectVixRollover(series) {
  if (!series || series.length < 4) return null
  const w = series.slice(-14)
  let peak = -Infinity
  let peakIdx = -1
  w.forEach((v, i) => { if (v > peak) { peak = v; peakIdx = i } })
  const current = w[w.length - 1]
  if (peak >= 30 && peakIdx < w.length - 1 && current <= peak * 0.9) {
    return { peak: Math.round(peak * 10) / 10 }
  }
  return null
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
function VIXCard({ vix, lang, history }) {
  if (!vix) return null
  const v = vix.value
  const label = lang === 'zh' ? vix.label_zh : vix.label_en  // backend only has zh/en
  const pct   = Math.min(100, Math.max(0, ((v - 10) / 50) * 100))
  const color = v < 18 ? 'var(--green)' : v < 25 ? 'var(--accent)' : v < 30 ? '#f97316' : 'var(--red)'
  const series = history?.map(h => h.vix) ?? []
  const rollover = detectVixRollover(series)

  return (
    <Cell borderRight borderBottom>
      <Label>VIX / Volatility Index</Label>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
        <BigNumber value={v} decimals={1} />
        <StatusLabel color={color}>{label}</StatusLabel>
        <div style={{ marginLeft: 'auto' }}>
          <Sparkline data={series} color={color} label="30D" />
        </div>
      </div>
      <RulerBar pct={pct} color={color} ticks={[4, 16, 30, 40, 60]} />
      <TickLabels labels={['12', '18', '25', '30', '40+']} />
      {rollover && (
        <div style={{
          marginTop: '0.9rem',
          fontFamily: 'JetBrains Mono',
          fontSize: '8px',
          letterSpacing: '0.06em',
          padding: '0.45rem 0.7rem',
          borderLeft: '2px solid var(--green)',
          color: 'var(--green)',
          background: 'var(--green-dim)',
          lineHeight: 1.6,
        }}>
          {tr(lang, {
            zh: `↘ VIX 已从高位回落（峰值 ${rollover.peak}）— 抄底确认度提升`,
            en: `↘ VIX rolling over from a peak of ${rollover.peak} — dip-buy confidence rising`,
            ja: `↘ VIX が高値（ピーク ${rollover.peak}）から反落 — 押し目買いの確度が上昇`,
            fr: `↘ Le VIX reflue après un pic de ${rollover.peak} — confiance d'achat sur repli accrue`,
            de: `↘ VIX dreht vom Hoch (Spitze ${rollover.peak}) ab — höhere Zuversicht für Nachkäufe`,
            ru: `↘ VIX откатывается с пика ${rollover.peak} — уверенность в покупке просадки растёт`,
          })}
        </div>
      )}
    </Cell>
  )
}

function FGCard({ fg, lang, history }) {
  if (!fg) return null
  const score = fg.score
  const label = lang === 'zh' ? fg.label_zh : fg.label_en  // backend only has zh/en
  const pct   = score != null ? Math.min(100, Math.max(0, score)) : 50
  const color = score < 25 ? 'var(--red)' : score < 45 ? '#f97316' : score < 55 ? 'var(--text-dim)' : score < 75 ? 'var(--accent)' : 'var(--green)'
  const series = history?.map(h => h.fg_score) ?? []

  return (
    <Cell borderBottom>
      <Label>Fear &amp; Greed / {tr(lang, { zh: '恐贪指数', en: 'Sentiment', ja: '恐怖&貪欲指数', fr: 'Sentiment', de: 'Stimmung', ru: 'Настроение' })}</Label>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
        <BigNumber value={score} decimals={0} duration={1100} />
        <StatusLabel color={color}>{label}</StatusLabel>
        <div style={{ marginLeft: 'auto' }}>
          <Sparkline data={series} color={color} label="30D" />
        </div>
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
  const divBg    = div < -1 ? 'var(--red-dim)' : div < 0 ? 'var(--accent-glow)' : 'var(--green-dim)'
  // Equal-weight (RSP) vs cap-weight (SPY): positive = broad participation,
  // negative = a few heavyweights masking a weaker average stock. One-day
  // spread is noisy, so phrased as a directional hint.
  const divText  = tr(lang,
    div < -1
      ? { zh: '⚠ 广度恶化：少数巨头支撑，根基脆弱', en: '⚠ BREADTH DETERIORATING — propped up by a few giants, fragile base', ja: '⚠ 広度が悪化：少数の巨大株が支え、基盤は脆弱', fr: '⚠ AMPLEUR EN DÉGRADATION — portée par quelques géants, base fragile', de: '⚠ BREITE VERSCHLECHTERT — von wenigen Giganten gestützt, fragile Basis', ru: '⚠ ШИРОТА УХУДШАЕТСЯ — держат несколько гигантов, база хрупкая' }
      : div < 0
      ? { zh: '// 广度偏弱：行情集中于少数权重股', en: '// BREADTH NARROWING — led by a few heavyweights', ja: '// 広度はやや弱い：少数の主力株に集中', fr: '// AMPLEUR FAIBLE — portée par quelques poids lourds', de: '// BREITE SCHWACH — von wenigen Schwergewichten getragen', ru: '// ШИРОТА СЛАБАЯ — тянут несколько тяжеловесов' }
      : { zh: '// 广度健康：涨跌普遍参与，非少数权重股主导', en: '// BREADTH HEALTHY — broad participation, not just mega-caps', ja: '// 広度は健全：値動きは広く参加、少数の大型株頼みではない', fr: '// AMPLEUR SAINE — participation large, pas seulement les méga-caps', de: '// BREITE GESUND — breite Beteiligung, nicht nur Mega-Caps', ru: '// ШИРОТА В НОРМЕ — широкое участие, не только мегакапы' }
  )

  return (
    <Cell borderRight>
      <Label>Breadth / {tr(lang, { zh: '市场广度', en: 'Market Breadth', ja: '市場の幅', fr: 'Ampleur du marché', de: 'Marktbreite', ru: 'Широта рынка' })}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <EtfRow ticker="SPY" sublabel={tr(lang, { zh: '市值加权', en: 'cap-wtd', ja: '時価加重', fr: 'pondéré cap.', de: 'kap.-gew.', ru: 'взвеш. по кап.' })} value={breadth.spy_chg} />
        <EtfRow ticker="RSP" sublabel={tr(lang, { zh: '等权重',   en: 'eq-wtd',  ja: '均等加重', fr: 'équipondéré', de: 'gleichgew.', ru: 'равновес.' })} value={breadth.rsp_chg} />
        <EtfRow ticker="IWM" sublabel={tr(lang, { zh: '小盘股',   en: 'sm-cap',  ja: '小型株',   fr: 'petites cap.', de: 'Small Cap', ru: 'малая кап.' })}   value={breadth.iwm_chg} />
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {tr(lang, { zh: 'RSP−SPY 分化度', en: 'RSP−SPY Spread', ja: 'RSP−SPY 乖離', fr: 'Écart RSP−SPY', de: 'RSP−SPY-Spread', ru: 'Спред RSP−SPY' })}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 500, color: divColor }}>
            {div >= 0 ? '+' : ''}{Number(div).toFixed(2)}%
          </span>
        </div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono',
        fontSize: '8px',
        letterSpacing: '0.08em',
        padding: '0.45rem 0.7rem',
        marginTop: '0.9rem',
        borderLeft: `2px solid ${divColor}`,
        color: divColor,
        background: divBg,
        lineHeight: 1.6,
      }}>
        {divText}
      </div>
    </Cell>
  )
}

function CreditCard({ credit, lang }) {
  if (!credit) return null
  const ok = !credit.stress

  return (
    <Cell>
      <Label>Credit / {tr(lang, { zh: '信用市场', en: 'Credit Markets', ja: '信用市場', fr: 'Marchés du crédit', de: 'Kreditmärkte', ru: 'Кредитные рынки' })}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: '0.9rem' }}>
        <EtfRow ticker="HYG" sublabel={tr(lang, { zh: '高收益债', en: 'Hi-Yield', ja: 'ハイイールド債', fr: 'Haut rendement', de: 'Hochzins', ru: 'Высокодох.' }) + ' · iShares'} value={credit.hyg_chg} />
        <EtfRow ticker="JNK" sublabel={tr(lang, { zh: '高收益债', en: 'Hi-Yield', ja: 'ハイイールド債', fr: 'Haut rendement', de: 'Hochzins', ru: 'Высокодох.' }) + ' · SPDR'} value={credit.jnk_chg} />
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
          ? tr(lang, { zh: '// 信用市场正常', en: '// CREDIT STABLE', ja: '// 信用市場は正常', fr: '// CRÉDIT STABLE', de: '// KREDIT STABIL', ru: '// КРЕДИТ СТАБИЛЕН' })
          : tr(lang, { zh: '⚠ 信用市场承压，谨慎抄底', en: '⚠ CREDIT STRESS — CAUTION', ja: '⚠ 信用市場に圧力 — 慎重に', fr: '⚠ STRESS DE CRÉDIT — PRUDENCE', de: '⚠ KREDITSTRESS — VORSICHT', ru: '⚠ КРЕДИТНЫЙ СТРЕСС — ОСТОРОЖНО' })}
      </div>
    </Cell>
  )
}

function CrossAssetCard({ ca, lang }) {
  if (!ca) return null

  return (
    <Cell colSpan style={{ borderTop: '1px solid var(--border)' }}>
      <Label>Cross-Asset / {tr(lang, { zh: '跨资产', en: 'Multi-Asset', ja: 'クロスアセット', fr: 'Multi-actifs', de: 'Multi-Asset', ru: 'Мультиактив' })}</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.9rem' }}>
        {[
          { ticker: 'TLT', sub: tr(lang, { zh: '美国长债', en: 'US LT Bonds', ja: '米長期国債', fr: 'Oblig. LT US', de: 'US-Langläufer', ru: 'Долгоср. облиг. США' }), v: ca.tlt_chg },
          { ticker: 'GLD', sub: tr(lang, { zh: '黄金',     en: 'Gold',        ja: '金',         fr: 'Or',           de: 'Gold',          ru: 'Золото' }),         v: ca.gld_chg },
          { ticker: 'UUP', sub: tr(lang, { zh: '美元指数', en: 'USD Index',   ja: '米ドル指数', fr: 'Indice USD',   de: 'USD-Index',     ru: 'Индекс доллара' }), v: ca.uup_chg },
        ].map(({ ticker, sub, v }) => (
          <div key={ticker}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 500, color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{ticker}</div>
            <div style={{ fontFamily: 'Syne', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{sub}</div>
            <ChgBadge value={v} />
          </div>
        ))}
      </div>
      {ca.notes?.length > 0 && (
        <div style={{
          padding: '0.55rem 0.7rem',
          borderLeft: '2px solid var(--border-bright)',
          background: 'var(--neutral-dim)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
        }}>
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
  const cached        = useQuery(api.cache.latest)
  const history       = useQuery(api.history.recent, { days: 30 })
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed]         = useState(false)

  // Render instantly from the shared cache; refresh on mount. The action serves
  // a ≤60s shared cache and only hits external APIs when stale.
  useEffect(() => {
    getSignals().then(() => setFailed(false)).catch(() => setFailed(true))
  }, [getSignals])

  const data       = cached?.data ?? null
  const lastUpdate = cached?.updatedAt ?? null

  const refresh = () => {
    setRefreshing(true)
    getSignals({ force: true })
      .then(() => setFailed(false))
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false))
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Syne', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            Jessie Signal
          </h1>
          {lastUpdate && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '0.12em', marginTop: '0.3rem' }}>
              {tr(lang, { zh: '更新于', en: 'UPDATED', ja: '更新', fr: 'MAJ', de: 'STAND', ru: 'ОБНОВЛЕНО' })}{' '}
              {new Date(lastUpdate).toLocaleTimeString(DATE_LOCALE[lang] ?? 'en-US')}
              {refreshing && <span className="cursor-blink" style={{ color: 'var(--accent)', marginLeft: '0.6rem' }}>· SYNC</span>}
            </div>
          )}
        </div>
        <button
          onClick={refresh}
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
          {tr(lang, { zh: '刷新', en: 'REFRESH', ja: '更新', fr: 'ACTUALISER', de: 'AKTUALISIEREN', ru: 'ОБНОВИТЬ' })}
        </button>
      </div>

      {!data ? (
        failed ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.2em' }}>
            ERR: FAILED TO LOAD
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 0', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
            LOADING<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span>
          </div>
        )
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
            <VIXCard    vix={data.vix}          lang={lang} history={history} />
            <FGCard     fg={data.fear_greed}    lang={lang} history={history} />
            <BreadthCard breadth={data.breadth} lang={lang} />
            <CreditCard credit={data.credit}    lang={lang} />
            <CrossAssetCard ca={data.cross_asset} lang={lang} />
          </div>

          <div style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '7px',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textAlign: 'center',
            marginTop: '1.5rem',
            lineHeight: 2,
          }}>
            <p style={{ margin: 0 }}>
              {tr(lang, {
                zh: '// 情景分类基于阈值自动推断 · 仅供参考 · 不构成投资建议',
                en: '// SCENARIO CLASSIFICATION IS AUTO-DERIVED · FOR REFERENCE ONLY · NOT INVESTMENT ADVICE',
                ja: '// シナリオ分類はしきい値から自動導出 · 参考情報のみ · 投資アドバイスではありません',
                fr: "// CLASSIFICATION AUTO-DÉRIVÉE DE SEUILS · À TITRE INDICATIF · PAS UN CONSEIL EN INVESTISSEMENT",
                de: '// SZENARIO AUTOMATISCH AUS SCHWELLEN ABGELEITET · NUR ZUR INFORMATION · KEINE ANLAGEBERATUNG',
                ru: '// СЦЕНАРИЙ ОПРЕДЕЛЁН АВТОМАТИЧЕСКИ ПО ПОРОГАМ · ТОЛЬКО ДЛЯ СПРАВКИ · НЕ ИНВЕСТИЦИОННЫЙ СОВЕТ',
              })}
            </p>
            <p style={{ margin: 0 }}>
              {tr(lang, {
                zh: '// 基于 ',
                en: '// built on a method by ',
                ja: '// ',
                fr: "// d'après une méthode de ",
                de: '// basiert auf einer Methode von ',
                ru: '// на основе метода ',
              })}
              <a
                href="https://youtu.be/MfB9zaul_pk?si=xAmPQfPTopR689eU"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--text-dim)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-bright)',
                  paddingBottom: '1px',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
              >
                Jessie
              </a>
              {tr(lang, { zh: ' 的视频方法构建', en: '', ja: ' の動画を参考に構築', fr: '', de: '', ru: '' })}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
