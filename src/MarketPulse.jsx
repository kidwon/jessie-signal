import { useState, useEffect, useRef, useCallback } from 'react'
import { useAction } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useI18n } from './i18n.jsx'

const CACHE_TTL = 5 * 60 * 1000 // 5 min

function fmt(v, d = 2) {
  if (v == null) return '—'
  return Number(v).toFixed(d)
}

function ChgBadge({ value, suffix = '%' }) {
  if (value == null) return <span className="text-gray-500">—</span>
  const n = Number(value)
  const color = n > 0 ? 'text-green-400' : n < 0 ? 'text-red-400' : 'text-gray-400'
  return <span className={`font-mono font-medium ${color}`}>{n >= 0 ? '+' : ''}{n.toFixed(2)}{suffix}</span>
}

const SCENARIO_GUIDE = [
  { num: 0, name_zh: '信号不明',              name_en: 'Unclear',                       cond_zh: 'VIX 处于中间区间，恐贪指数未达极端',                        cond_en: 'VIX in middle range, F&G not at extremes',                   action_zh: '等待更清晰的信号，保持观望。',                                                                                                    action_en: 'Wait for clearer signals. Stay on the sidelines.' },
  { num: 1, name_zh: '正常调整',              name_en: 'Normal Correction',              cond_zh: 'VIX 18–25，市场有所波动但未进入恐慌',                       cond_en: 'VIX 18–25, elevated but not panic territory',                action_zh: '维持标准定投节奏，不必恐慌，也不必激进抄底。',                                                                                     action_en: 'Maintain standard DCA. No need to panic or aggressively buy the dip.' },
  { num: 2, name_zh: '恐慌',                 name_en: 'Panic',                          cond_zh: 'VIX 25–35，恐贪指数 < 25，信用市场尚稳',                   cond_en: 'VIX 25–35, F&G < 25, credit markets stable',                action_zh: '分批建仓：先投闲置资金 30%，VIX 触 30 再加 30%，VIX 破 40 或明显回落时投入剩余 40%。',                                               action_en: 'Tranche-based buying: deploy 30% now, another 30% at VIX 30, final 40% when VIX breaks 40 or rolls over.' },
  { num: 3, name_zh: '极度恐慌（可抄底）',    name_en: 'Extreme Panic (Buy Opportunity)', cond_zh: 'VIX ≥ 35，恐贪指数 < 15，信用市场无明显压力',              cond_en: 'VIX ≥ 35, F&G < 15, no significant credit stress',          action_zh: '积极布局优质核心资产，始终保留部分现金，切勿一次性全仓。',                                                                           action_en: 'Aggressively target quality assets. Always preserve some cash — never go all-in at once.' },
  { num: 4, name_zh: '系统性风险（不可抄底）', name_en: 'Systemic Risk (Do NOT Buy)',     cond_zh: 'VIX ≥ 30 且信用市场承压（HYG 或 JNK 单日跌幅 > 1.5%）',    cond_en: 'VIX ≥ 30 AND credit stress (HYG or JNK down > 1.5%)',       action_zh: '绝对不要急于抄底。降低杠杆，减持高 Beta 股，储备现金，等待信用市场企稳信号。',                                                       action_en: 'Do not rush to buy the dip. Reduce leverage, cut high-beta stocks, stockpile cash, wait for credit markets to stabilize.' },
  { num: 5, name_zh: '极度贪婪（减仓信号）',  name_en: 'Extreme Greed (De-risk)',        cond_zh: 'VIX < 18 且恐贪指数 > 75，市场过热',                       cond_en: 'VIX < 18 AND F&G > 75, market overheated',                  action_zh: '市场估值已拉伸。逐步减仓，轮换至防御性资产，可考虑 Covered Call 锁定收益。',                                                         action_en: 'Valuations are stretched. Scale back exposure, rotate into defensive assets, write Covered Calls.' },
]

const BUBBLE_COLOR = {
  0: { pill: 'bg-gray-600/80 hover:bg-gray-600',     active: 'bg-gray-500',   text: 'text-gray-100',   ring: 'ring-gray-400',   border: 'border-gray-500',   arrow: 'border-t-gray-400'   },
  1: { pill: 'bg-blue-800/80 hover:bg-blue-700',     active: 'bg-blue-600',   text: 'text-blue-100',   ring: 'ring-blue-400',   border: 'border-blue-500',   arrow: 'border-t-blue-400'   },
  2: { pill: 'bg-yellow-700/80 hover:bg-yellow-600', active: 'bg-yellow-500', text: 'text-yellow-100', ring: 'ring-yellow-400', border: 'border-yellow-500', arrow: 'border-t-yellow-400' },
  3: { pill: 'bg-green-800/80 hover:bg-green-700',   active: 'bg-green-600',  text: 'text-green-100',  ring: 'ring-green-400',  border: 'border-green-500',  arrow: 'border-t-green-400'  },
  4: { pill: 'bg-red-800/80 hover:bg-red-700',       active: 'bg-red-600',    text: 'text-red-100',    ring: 'ring-red-400',    border: 'border-red-500',    arrow: 'border-t-red-400'    },
  5: { pill: 'bg-purple-800/80 hover:bg-purple-700', active: 'bg-purple-600', text: 'text-purple-100', ring: 'ring-purple-400', border: 'border-purple-500', arrow: 'border-t-purple-400' },
}

function ScenarioBubbles({ activeNum, lang }) {
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)
  const activeS = SCENARIO_GUIDE.find(s => s.num === activeNum)

  return (
    <div className="mb-6">
      {pinned !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setPinned(null)} />
      )}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {SCENARIO_GUIDE.map((s, idx) => {
          const c = BUBBLE_COLOR[s.num]
          const isActive = s.num === activeNum
          const showTip = (hovered === s.num || pinned === s.num) && !isActive
          // 按列位置对齐：第3列(idx%3==2)靠右，其余靠左，避免溢出屏幕
          const tipAlign = idx % 3 === 2 ? 'right-0' : 'left-0'
          return (
            <div
              key={s.num}
              className="relative"
              onMouseEnter={() => setHovered(s.num)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setPinned(pinned === s.num ? null : s.num)}
            >
              {showTip && (
                <div className={`absolute bottom-full mb-3 w-52 bg-gray-900 border border-gray-700 rounded-lg p-3 z-50 shadow-2xl pointer-events-none ${tipAlign}`}>
                  <div className="text-[10px] text-gray-400 leading-snug mb-1.5">
                    {lang === 'zh' ? s.cond_zh : s.cond_en}
                  </div>
                  <div className="text-[10px] text-gray-200 leading-snug">
                    {lang === 'zh' ? s.action_zh : s.action_en}
                  </div>
                  <div className={`absolute top-full w-0 h-0
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-t-[6px] border-t-gray-700
                    ${tipAlign === 'right-0' ? 'right-4' : 'left-4'}`} />
                </div>
              )}
              <div className={`
                w-full py-2 px-1 rounded text-[11px] font-semibold text-center cursor-default select-none transition-all leading-tight min-h-[44px] flex items-center justify-center
                ${isActive ? `${c.active} ${c.text} ring-2 ${c.ring} shadow-lg` : `${c.pill} ${c.text} opacity-70 hover:opacity-100`}
              `}>
                {lang === 'zh' ? s.name_zh : s.name_en}
              </div>
              {isActive && (
                <div className={`
                  absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0
                  border-l-[6px] border-l-transparent
                  border-r-[6px] border-r-transparent
                  border-t-[7px] ${c.arrow}
                `} />
              )}
            </div>
          )
        })}
      </div>

      {activeS && (
        <div className={`mt-3 rounded-lg px-4 py-4 border ${BUBBLE_COLOR[activeNum]?.border ?? 'border-gray-600'} bg-gray-800/50`}>
          <div className="text-base font-semibold text-white mb-3 text-center sm:hidden">
            {lang === 'zh' ? activeS.name_zh : activeS.name_en}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-stretch sm:min-h-[80px]">
            <div className="hidden sm:flex flex-shrink-0 w-32 items-center justify-center text-center">
              <div className="text-lg font-semibold text-white leading-snug">
                {lang === 'zh' ? activeS.name_zh : activeS.name_en}
              </div>
            </div>
            <div className={`hidden sm:block w-px self-stretch ${BUBBLE_COLOR[activeNum]?.border?.replace('border-', 'bg-') ?? 'bg-gray-600'} opacity-50`} />
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0 mt-0.5">🔍</span>
              <p className="text-sm text-gray-300 leading-snug">
                {lang === 'zh' ? activeS.cond_zh : activeS.cond_en}
              </p>
            </div>
            <div className="w-full sm:w-px sm:self-stretch h-px sm:h-auto bg-gray-700/60" />
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0 mt-0.5">💡</span>
              <p className="text-sm text-gray-200 leading-snug">
                {lang === 'zh' ? activeS.action_zh : activeS.action_en}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SignalCard({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  )
}

function VIXCard({ vix, lang }) {
  if (!vix) return null
  const label = lang === 'zh' ? vix.label_zh : vix.label_en
  const v = vix.value
  const pct = Math.min(100, Math.max(0, ((v - 10) / 50) * 100))
  const barColor = v < 18 ? 'bg-green-500' : v < 25 ? 'bg-yellow-500' : v < 30 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <SignalCard title="VIX 波动率指数">
      <div className="flex items-end justify-between mb-3">
        <span className="text-3xl font-mono font-bold text-white">{fmt(v, 1)}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>12</span><span>18</span><span>25</span><span>30</span><span>40+</span>
      </div>
    </SignalCard>
  )
}

function FGCard({ fg, lang }) {
  if (!fg) return null
  const label = lang === 'zh' ? fg.label_zh : fg.label_en
  const score = fg.score
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 50
  const barColor = score < 25 ? 'bg-red-500' : score < 45 ? 'bg-orange-500' : score < 55 ? 'bg-gray-400' : score < 75 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <SignalCard title="恐贪指数 Fear & Greed">
      <div className="flex items-end justify-between mb-3">
        <span className="text-3xl font-mono font-bold text-white">{score != null ? score : '—'}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </SignalCard>
  )
}

function BreadthCard({ breadth }) {
  if (!breadth) return null
  const div = breadth.divergence
  const divColor = div < -1 ? 'text-red-400' : div < 0 ? 'text-yellow-400' : 'text-green-400'
  return (
    <SignalCard title="市场广度 Breadth">
      <div className="space-y-2">
        {[
          { label: 'SPY（市值加权）', v: breadth.spy_chg },
          { label: 'RSP（等权重）',   v: breadth.rsp_chg },
          { label: 'IWM（小盘股）',   v: breadth.iwm_chg },
        ].map(({ label, v }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-400 text-xs">{label}</span>
            <ChgBadge value={v} />
          </div>
        ))}
        <div className="border-t border-gray-800 pt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">RSP − SPY（分化度）</span>
          <span className={`font-mono font-medium ${divColor}`}>{div >= 0 ? '+' : ''}{fmt(div)}%</span>
        </div>
      </div>
    </SignalCard>
  )
}

function CreditCard({ credit }) {
  if (!credit) return null
  const ok = !credit.stress
  return (
    <SignalCard title="信用市场 Credit">
      <div className="space-y-2 mb-3">
        {[
          { label: 'HYG（高收益债 ETF）', v: credit.hyg_chg },
          { label: 'JNK（高收益债 ETF）', v: credit.jnk_chg },
        ].map(({ label, v }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-400 text-xs">{label}</span>
            <ChgBadge value={v} />
          </div>
        ))}
      </div>
      <div className={`text-xs px-2 py-1 rounded text-center font-medium ${ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
        {ok ? '信用市场正常，股市调整可能只是短暂' : '⚠️ 信用市场承压，谨慎抄底'}
      </div>
    </SignalCard>
  )
}

function CrossAssetCard({ ca, lang }) {
  if (!ca) return null
  return (
    <SignalCard title="跨资产 Cross-Asset">
      <div className="space-y-2 mb-3">
        {[
          { label: 'TLT（美国长债）', v: ca.tlt_chg },
          { label: 'GLD（黄金）',     v: ca.gld_chg },
          { label: 'UUP（美元指数）', v: ca.uup_chg },
        ].map(({ label, v }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-400 text-xs">{label}</span>
            <ChgBadge value={v} />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {ca.notes.map((n, i) => (
          <p key={i} className="text-[11px] text-gray-400 leading-snug">
            {lang === 'zh' ? n.zh : n.en}
          </p>
        ))}
      </div>
    </SignalCard>
  )
}

export default function MarketPulse() {
  const { lang } = useI18n()
  const getSignals = useAction(api.signals.get)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-y-1 mb-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h2 className="text-lg font-semibold text-white">{lang === 'zh' ? '市场信号仪表盘' : 'Market Pulse'}</h2>
          {lastUpdate && (
            <p className="text-xs text-gray-500">
              {lang === 'zh' ? '更新于' : 'Updated'} {lastUpdate.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US')}
              <span className="ml-1.5 text-gray-600">· {lang === 'zh' ? '5 分钟缓存' : '5 min cache'}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          className="text-xs text-gray-400 hover:text-white px-3 py-1 bg-gray-800 rounded transition-colors"
        >
          {lang === 'zh' ? '强制刷新' : 'Force Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">
          {lang === 'zh' ? '加载中…' : 'Loading…'}
        </div>
      ) : !data ? (
        <div className="text-center text-gray-500 py-20 text-sm">
          {lang === 'zh' ? '获取数据失败' : 'Failed to load data'}
        </div>
      ) : (
        <>
          <ScenarioBubbles activeNum={data.scenario?.scenario} lang={lang} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VIXCard vix={data.vix} lang={lang} />
            <FGCard fg={data.fear_greed} lang={lang} />
            <BreadthCard breadth={data.breadth} />
            <CreditCard credit={data.credit} />
            <div className="md:col-span-2">
              <CrossAssetCard ca={data.cross_asset} lang={lang} />
            </div>
          </div>
          <p className="text-[10px] text-gray-700 text-center mt-4">
            {lang === 'zh'
              ? '情景分类基于文档策略逻辑自动推断，仅供参考，不构成投资建议。'
              : 'Scenario classification is auto-derived from signal thresholds. For reference only — not investment advice.'}
          </p>
        </>
      )}
    </div>
  )
}
