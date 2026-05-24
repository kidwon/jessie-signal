import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
