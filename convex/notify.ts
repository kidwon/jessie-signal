import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Sends a scenario-change alert to all subscribers via Resend. Skips silently
// when RESEND_API_KEY is not set, so the cron never fails on a missing key.
export const notifyScenarioChange = internalAction({
  args: {
    name_zh: v.string(),
    name_en: v.string(),
    action_zh: v.string(),
    action_en: v.string(),
    vix: v.number(),
    fg: v.number(),
  },
  handler: async (ctx, a) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return; // not configured — skip
    const from = process.env.ALERT_FROM ?? "Jessie Signal <onboarding@resend.dev>";

    const subscribers = await ctx.runQuery(internal.subscriptions.listSubscribers, {});

    for (const sub of subscribers) {
      const zh = sub.lang === "zh";
      const name = zh ? a.name_zh : a.name_en;
      const action = zh ? a.action_zh : a.action_en;
      const subject = zh
        ? `【Jessie Signal】市场情景变化：${name}`
        : `[Jessie Signal] Market scenario changed: ${name}`;
      const html = zh
        ? `<div style="font-family:system-ui,sans-serif;max-width:480px">
             <h2 style="margin:0 0 8px">${name}</h2>
             <p style="color:#555">VIX <b>${a.vix}</b> · 恐贪 <b>${a.fg}</b></p>
             <p>${action}</p>
             <p><a href="https://jessiesignal.com">查看仪表盘 →</a></p>
             <hr><small style="color:#888">仅供参考，不构成投资建议。</small>
           </div>`
        : `<div style="font-family:system-ui,sans-serif;max-width:480px">
             <h2 style="margin:0 0 8px">${name}</h2>
             <p style="color:#555">VIX <b>${a.vix}</b> · F&amp;G <b>${a.fg}</b></p>
             <p>${action}</p>
             <p><a href="https://jessiesignal.com">Open dashboard →</a></p>
             <hr><small style="color:#888">For reference only. Not investment advice.</small>
           </div>`;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [sub.email], subject, html }),
        });
      } catch {
        // ignore individual send failures
      }
    }
  },
});

// Sends a Fear & Greed level-change alert to all subscribers via Resend. Same
// silent-skip behavior as notifyScenarioChange when RESEND_API_KEY is missing.
export const notifyFearGreedChange = internalAction({
  args: {
    label_zh: v.string(),
    label_en: v.string(),
    score: v.number(),
    vix: v.number(),
  },
  handler: async (ctx, a) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return; // not configured — skip
    const from = process.env.ALERT_FROM ?? "Jessie Signal <onboarding@resend.dev>";

    const subscribers = await ctx.runQuery(internal.subscriptions.listSubscribers, {});

    for (const sub of subscribers) {
      const zh = sub.lang === "zh";
      const label = zh ? a.label_zh : a.label_en;
      const subject = zh
        ? `【Jessie Signal】恐贪指数变化：${label}`
        : `[Jessie Signal] Fear & Greed changed: ${label}`;
      const html = zh
        ? `<div style="font-family:system-ui,sans-serif;max-width:480px">
             <h2 style="margin:0 0 8px">恐贪指数：${label}</h2>
             <p style="color:#555">恐贪 <b>${a.score}</b> · VIX <b>${a.vix}</b></p>
             <p><a href="https://jessiesignal.com">查看仪表盘 →</a></p>
             <hr><small style="color:#888">仅供参考，不构成投资建议。</small>
           </div>`
        : `<div style="font-family:system-ui,sans-serif;max-width:480px">
             <h2 style="margin:0 0 8px">Fear &amp; Greed: ${label}</h2>
             <p style="color:#555">F&amp;G <b>${a.score}</b> · VIX <b>${a.vix}</b></p>
             <p><a href="https://jessiesignal.com">Open dashboard →</a></p>
             <hr><small style="color:#888">For reference only. Not investment advice.</small>
           </div>`;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [sub.email], subject, html }),
        });
      } catch {
        // ignore individual send failures
      }
    }
  },
});
