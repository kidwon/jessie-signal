import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Public, fast: the latest cached signal payload for instant first paint.
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("marketCache").first();
    return row ? { data: row.data, updatedAt: row.updatedAt } : null;
  },
});

// Internal: overwrite the single cache row (written by signals.get + the cron).
export const set = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const existing = await ctx.db.query("marketCache").first();
    if (existing) await ctx.db.patch(existing._id, { data, updatedAt: Date.now() });
    else await ctx.db.insert("marketCache", { data, updatedAt: Date.now() });
  },
});
