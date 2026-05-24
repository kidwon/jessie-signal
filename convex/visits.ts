import { mutation, query } from "./_generated/server";
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

export const record = mutation({
  args: { lang: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.insert("visits", {
      timestamp: Date.now(),
      lang: args.lang,
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
