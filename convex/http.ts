import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api, internal } from "./_generated/api"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// Regional-indicator flag emoji from an ISO 3166-1 alpha-2 code.
function flag(cc: string): string {
  if (!cc || cc.length !== 2) return ""
  return String.fromCodePoint(
    ...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  )
}

// Resolve an IP to a display-ready country string (e.g. "🇺🇸 United States")
// via a free, keyless GeoIP service. Returns undefined on any failure.
async function lookupCountry(ip: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://ipwho.is/${ip}?fields=success,country,country_code`,
    )
    const data = await res.json()
    if (data?.success && data.country) {
      const f = flag(data.country_code ?? "")
      return f ? `${f} ${data.country}` : data.country
    }
  } catch {
    // network/parse error — leave country unset
  }
  return undefined
}

const COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  gray:   { bg: "#1a1a1a", accent: "#888888", badge: "#333333" },
  blue:   { bg: "#0d1b2a", accent: "#4a9eff", badge: "#1a3a5c" },
  yellow: { bg: "#1a1500", accent: "#f0c040", badge: "#3a3000" },
  green:  { bg: "#0a1a0f", accent: "#4caf50", badge: "#1a3a1f" },
  red:    { bg: "#1a0a0a", accent: "#ef5350", badge: "#3a1010" },
  purple: { bg: "#150d1f", accent: "#ab47bc", badge: "#2d1a40" },
}

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const char of text) {
    current += char
    if (current.length >= maxChars) {
      lines.push(current)
      current = ""
    }
  }
  if (current) lines.push(current)
  return lines
}

const http = httpRouter()

http.route({
  path: "/api/og",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const state = await ctx.runQuery(api.visits.getMarketState)

    const name = state?.name_zh ?? "信号加载中"
    const action = state?.action_zh ?? "请稍候..."
    const color = state?.color ?? "gray"
    const vix = state?.vix ?? 0
    const fg = state?.fg_score ?? 0

    const c = COLORS[color] ?? COLORS.gray

    const actionLines = wrap(action, 22)
    const actionSvg = actionLines
      .map((line, i) => `<text x="60" y="${370 + i * 34}" font-family="system-ui,sans-serif" font-size="26" fill="#cccccc">${line}</text>`)
      .join("\n")

    const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${c.bg}"/>
  <rect x="0" y="0" width="6" height="630" fill="${c.accent}"/>

  <!-- Brand -->
  <text x="60" y="80" font-family="monospace" font-size="22" fill="${c.accent}" letter-spacing="6">JESSIE SIGNAL</text>
  <text x="60" y="108" font-family="monospace" font-size="14" fill="#666666" letter-spacing="2">市场情绪实时监控</text>

  <!-- Scenario badge -->
  <rect x="60" y="140" width="460" height="70" rx="8" fill="${c.badge}"/>
  <text x="84" y="190" font-family="system-ui,sans-serif" font-size="38" font-weight="700" fill="${c.accent}">${name}</text>

  <!-- Divider -->
  <line x1="60" y1="240" x2="1140" y2="240" stroke="#333333" stroke-width="1"/>

  <!-- Action label -->
  <text x="60" y="300" font-family="monospace" font-size="16" fill="#555555" letter-spacing="3">操作建议</text>

  <!-- Action text -->
  ${actionSvg}

  <!-- Metrics -->
  <rect x="60" y="530" width="180" height="60" rx="6" fill="${c.badge}"/>
  <text x="150" y="555" font-family="monospace" font-size="13" fill="#666666" text-anchor="middle">VIX</text>
  <text x="150" y="578" font-family="monospace" font-size="22" font-weight="700" fill="${c.accent}" text-anchor="middle">${vix.toFixed(1)}</text>

  <rect x="260" y="530" width="220" height="60" rx="6" fill="${c.badge}"/>
  <text x="370" y="555" font-family="monospace" font-size="13" fill="#666666" text-anchor="middle">Fear &amp; Greed</text>
  <text x="370" y="578" font-family="monospace" font-size="22" font-weight="700" fill="${c.accent}" text-anchor="middle">${fg.toFixed(0)}</text>
</svg>`

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    })
  }),
})

// Records a visit with the real client IP (deduped per IP per day server-side).
http.route({
  path: "/api/visit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const fwd = request.headers.get("x-forwarded-for") ?? ""
    const ip = fwd.split(",")[0].trim() || "unknown"
    const lang = new URL(request.url).searchParams.get("lang") ?? undefined

    // Only geolocate the first hit from this IP today, to spare the free quota.
    let country: string | undefined
    if (ip !== "unknown") {
      const seen = await ctx.runQuery(internal.visits.wasVisitedToday, { ip })
      if (!seen) country = await lookupCountry(ip)
    }

    await ctx.runMutation(internal.visits.recordVisit, { ip, lang, country })
    return new Response(null, { status: 204, headers: CORS })
  }),
})

http.route({
  path: "/api/visit",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
})

export default http
