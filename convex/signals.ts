import { action, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"

const ETF = ["SPY", "RSP", "IWM", "HYG", "JNK", "TLT", "GLD", "UUP"]

type Meta = { name_zh: string; name_en: string; action_zh: string; action_en: string; color: string }

function classifyScenario(vix: number, fg: number, hygChg: number, jnkChg: number) {
  const creditStress = hygChg < -1.5 || jnkChg < -1.5
  let num: number
  // Severity-ordered, gap-free. Credit stress is the top red flag; high VIX is
  // panic even when sentiment isn't extreme; calm low-VIX falls through to 0.
  if (creditStress && vix >= 30) num = 4
  else if (vix >= 35 && fg < 15) num = 3
  else if (vix >= 30 || (vix >= 25 && fg < 25)) num = 2
  else if (vix < 18 && fg > 75) num = 5
  else if (vix >= 18) num = 1
  else num = 0

  // Names/actions kept in sync with src/MarketPulse.jsx SCENARIOS (this copy is
  // used only for the OG share image via saveMarketState).
  const META: Record<number, Meta> = {
    0: { name_zh: "市场平静", name_en: "Calm", action_zh: "市场平静，无需特别操作，按计划持有或定投即可。", action_en: "Market is calm. No special action — hold or stick to your DCA plan.", color: "gray" },
    1: { name_zh: "正常调整", name_en: "Normal Correction", action_zh: "维持标准定投节奏，不必恐慌，也不必激进抄底。", action_en: "Maintain standard DCA. No need to panic or aggressively buy the dip.", color: "blue" },
    2: { name_zh: "恐慌", name_en: "Panic", action_zh: "分批建仓：先投 30%，VIX 触 30 再加 30%，VIX 破 40 或回落时投入剩余 40%。", action_en: "Tranche-based buying: deploy 30% now, +30% at VIX 30, final 40% when VIX breaks 40 or rolls over.", color: "yellow" },
    3: { name_zh: "极度恐慌", name_en: "Extreme Panic", action_zh: "积极布局优质核心资产，始终保留部分现金，切勿一次性全仓。", action_en: "Aggressively target quality assets. Always preserve some cash — never go all-in at once.", color: "green" },
    4: { name_zh: "系统性风险", name_en: "Systemic Risk", action_zh: "绝对不要急于抄底。降低杠杆，减持高 Beta 股，储备现金，等待信用市场企稳。", action_en: "Do not rush to buy the dip. Reduce leverage, cut high-beta stocks, stockpile cash, wait for credit markets to stabilize.", color: "red" },
    5: { name_zh: "极度贪婪", name_en: "Extreme Greed", action_zh: "市场估值已拉伸。逐步减仓，轮换至防御性资产，可考虑 Covered Call 锁定收益。", action_en: "Valuations are stretched. Scale back exposure, rotate defensive, write Covered Calls.", color: "purple" },
  }
  return { scenario: num, ...META[num] }
}

function vixLabel(v: number) {
  if (v < 12) return { label_zh: "异常平静",  label_en: "Unusually Calm" }
  if (v < 18) return { label_zh: "平静",      label_en: "Calm"           }
  if (v < 25) return { label_zh: "升温",      label_en: "Heating Up"     }
  if (v < 30) return { label_zh: "紧张",      label_en: "Strained"       }
  if (v < 40) return { label_zh: "恐慌",      label_en: "Panic"          }
  return         { label_zh: "极度恐慌",    label_en: "Extreme Panic"  }
}

function fgLabel(score: number) {
  if (score < 25) return { label_zh: "极度恐惧", label_en: "Extreme Fear" }
  if (score < 45) return { label_zh: "恐惧",     label_en: "Fear"         }
  if (score < 55) return { label_zh: "中性",     label_en: "Neutral"      }
  if (score < 75) return { label_zh: "贪婪",     label_en: "Greed"        }
  return          { label_zh: "极度贪婪",   label_en: "Extreme Greed" }
}

// True during the US regular session (10:00–16:00 ET) on weekdays. Hourly
// snapshots are taken only in this window.
function isUsTradingHour(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === "weekday")?.value
  let hour = Number(parts.find((p) => p.type === "hour")?.value)
  if (hour === 24) hour = 0
  if (weekday === "Sat" || weekday === "Sun") return false
  return hour >= 10 && hour <= 16
}

// Fetch all sources and compute the full signal payload (no Convex ctx needed,
// so both the public action and the cron can reuse it).
async function computeSignals() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? ""

  const [vixRes, fgRes, ...quoteResponses] = await Promise.all([
    fetch("https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json"),
    fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: {
        "Referer": "https://www.cnn.com/markets/fear-and-greed",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
      },
    }),
    ...ETF.map(s => fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FINNHUB_KEY}`)),
  ])

  const vixData = await vixRes.json() as { data: { current_price: number } }
  const vix = Number(vixData.data.current_price) || 0

  const fgData = await fgRes.json() as { fear_and_greed: { score: number; rating: string } }
  const fgScore = Number(fgData.fear_and_greed?.score) || 50
  const fgRating = fgData.fear_and_greed?.rating ?? ""

  const quoteParsed = await Promise.all(quoteResponses.map(r => r.json() as Promise<{ dp?: number }>))
  const quotes: Record<string, number> = {}
  ETF.forEach((sym, i) => {
    quotes[sym] = Math.round((Number(quoteParsed[i]?.dp) || 0) * 100) / 100
  })

  const hygChg = quotes["HYG"]
  const jnkChg = quotes["JNK"]
  const spyChg = quotes["SPY"]
  const rspChg = quotes["RSP"]
  const iwmChg = quotes["IWM"]
  const tltChg = quotes["TLT"]
  const gldChg = quotes["GLD"]
  const uupChg = quotes["UUP"]

  const crossNotes: Array<{ zh: string; en: string }> = []
  if (tltChg < -0.5 && spyChg < -0.5) crossNotes.push({ zh: "美债收益率上升 + 股市下跌：估值压力，成长股承压", en: "Rising yields + falling equities: valuation pressure on growth stocks" })
  if (uupChg > 0.3 && spyChg < -0.5) crossNotes.push({ zh: "美元走强 + 股市下跌：全球避险情绪", en: "Strong USD + falling equities: global risk-off sentiment" })
  if (gldChg > 0.5 && tltChg > 0.3 && spyChg < 0) crossNotes.push({ zh: "黄金+美债双涨 + 股市下跌：避险资产轮动，经济衰退预期", en: "Gold + bonds rising with stocks falling: safe-haven rotation, recession fears" })
  if (gldChg > 0.5 && tltChg < -0.3) crossNotes.push({ zh: "黄金涨但美债跌：通胀恐慌或货币信用危机信号", en: "Gold rising, bonds falling: inflation panic or currency crisis signal" })
  if (crossNotes.length === 0) crossNotes.push({ zh: "跨资产暂无明显异动信号", en: "No significant cross-asset signals at this time" })

  const scenarioData = classifyScenario(vix, fgScore, hygChg, jnkChg)

  return {
    updated_at: Date.now() / 1000,
    scenario: scenarioData,
    vix: { value: vix, ...vixLabel(vix) },
    fear_greed: { score: Math.round(fgScore * 10) / 10, rating: fgRating, ...fgLabel(fgScore) },
    breadth: { spy_chg: spyChg, rsp_chg: rspChg, iwm_chg: iwmChg, divergence: Math.round((rspChg - spyChg) * 100) / 100 },
    credit: { hyg_chg: hygChg, jnk_chg: jnkChg, stress: hygChg < -1.5 || jnkChg < -1.5 },
    cross_asset: { tlt_chg: tltChg, gld_chg: gldChg, uup_chg: uupChg, notes: crossNotes },
  }
}

export const get = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const data = await computeSignals()
    try {
      await ctx.runMutation(api.visits.saveMarketState, {
        scenario: data.scenario.scenario,
        name_zh: data.scenario.name_zh,
        name_en: data.scenario.name_en,
        action_zh: data.scenario.action_zh,
        action_en: data.scenario.action_en,
        color: data.scenario.color,
        vix: data.vix.value,
        fg_score: data.fear_greed.score,
      })
    } catch (_) {}
    return data
  },
})

// Hourly cron target: capture one time-series row during US trading hours.
export const snapshot = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isUsTradingHour(new Date())) return
    const data = await computeSignals()
    if (!data.vix.value) return // fetch failed — don't store a zeroed row

    const prev = await ctx.runQuery(internal.history.latest, {})

    await ctx.runMutation(internal.history.insertHistory, {
      vix: data.vix.value,
      fg_score: data.fear_greed.score,
      scenario: data.scenario.scenario,
      spy_chg: data.breadth.spy_chg,
      rsp_chg: data.breadth.rsp_chg,
      iwm_chg: data.breadth.iwm_chg,
      hyg_chg: data.credit.hyg_chg,
      jnk_chg: data.credit.jnk_chg,
      tlt_chg: data.cross_asset.tlt_chg,
      gld_chg: data.cross_asset.gld_chg,
      uup_chg: data.cross_asset.uup_chg,
      divergence: data.breadth.divergence,
      credit_stress: data.credit.stress,
    })

    // Alert subscribers when the scenario changes into/out of a notable state
    // (panic/extreme panic/systemic/extreme greed) — skip calm↔correction flicker.
    const to = data.scenario.scenario
    const from = prev?.scenario
    const notable = (n: number) => n >= 2
    if (from != null && to !== from && (notable(to) || notable(from))) {
      await ctx.scheduler.runAfter(0, internal.notify.notifyScenarioChange, {
        name_zh: data.scenario.name_zh,
        name_en: data.scenario.name_en,
        action_zh: data.scenario.action_zh,
        action_en: data.scenario.action_en,
        vix: data.vix.value,
        fg: data.fear_greed.score,
      })
    }
  },
})
