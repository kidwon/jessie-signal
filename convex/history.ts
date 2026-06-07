import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Internal: only the snapshot cron writes history.
export const insertHistory = internalMutation({
  args: {
    timestamp: v.optional(v.number()), // backfill passes a past time; cron omits
    vix: v.number(),
    fg_score: v.number(),
    scenario: v.number(),
    spy_chg: v.number(),
    rsp_chg: v.number(),
    iwm_chg: v.number(),
    hyg_chg: v.number(),
    jnk_chg: v.number(),
    tlt_chg: v.number(),
    gld_chg: v.number(),
    uup_chg: v.number(),
    divergence: v.number(),
    credit_stress: v.boolean(),
  },
  handler: async (ctx, { timestamp, ...rest }) => {
    await ctx.db.insert("marketHistory", { timestamp: timestamp ?? Date.now(), ...rest });
  },
});

// Public: recent snapshots (oldest → newest) for trend charts. Market data is
// not sensitive, so this is open.
export const recent = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const since = Date.now() - (days ?? 90) * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("marketHistory")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .order("asc")
      .collect();
  },
});
