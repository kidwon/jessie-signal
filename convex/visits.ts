import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const saveMarketState = mutation({
  args: {
    scenario: v.number(),
    name_zh: v.string(),
    name_en: v.string(),
    action_zh: v.string(),
    action_en: v.string(),
    color: v.string(),
    vix: v.number(),
    fg_score: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("marketState").first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updated_at: Date.now() });
    } else {
      await ctx.db.insert("marketState", { ...args, updated_at: Date.now() });
    }
  },
});

export const getMarketState = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("marketState").first();
  },
});

// Records a visit, deduped per IP per (UTC) day. Internal: only callable from
// the /api/visit HTTP action, which supplies the real client IP — keeping the
// IP unspoofable by direct client calls.
export const recordVisit = internalMutation({
  args: { ip: v.string(), lang: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await ctx.db
      .query("visits")
      .withIndex("by_ip", (q) =>
        q.eq("ip", args.ip).gte("timestamp", todayStart.getTime()),
      )
      .first();
    if (existing) return; // same IP already counted today

    await ctx.db.insert("visits", {
      timestamp: Date.now(),
      lang: args.lang,
      ip: args.ip,
    });
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const all = await ctx.db.query("visits").collect();
    const todayCount = all.filter((v) => v.timestamp >= todayStart.getTime()).length;

    return {
      total: all.length,
      today: todayCount,
    };
  },
});
