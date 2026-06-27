import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { isAdminIdentity } from "./visits";

// All possible target states. Defaults (no row stored) enable every state, so a
// fresh deployment keeps the original "alert on any change" behavior.
export const ALL_SCENARIOS = [0, 1, 2, 3, 4, 5];
export const ALL_FEAR_GREED = [
  "Extreme Fear",
  "Fear",
  "Neutral",
  "Greed",
  "Extreme Greed",
];

function withDefaults(row: { scenarios: number[]; fearGreed: string[] } | null) {
  return {
    scenarios: row?.scenarios ?? ALL_SCENARIOS,
    fearGreed: row?.fearGreed ?? ALL_FEAR_GREED,
  };
}

// Internal: read by the snapshot cron to decide which alerts to send.
export const read = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("alertSettings").first();
    return withDefaults(row);
  },
});

// Admin-only: current alert settings for the admin dashboard.
export const get = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminIdentity(ctx))) throw new Error("Not authorized");
    const row = await ctx.db.query("alertSettings").first();
    return withDefaults(row);
  },
});

// Admin-only: replace the enabled-state lists.
export const update = mutation({
  args: {
    scenarios: v.array(v.number()),
    fearGreed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdminIdentity(ctx))) throw new Error("Not authorized");
    const existing = await ctx.db.query("alertSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("alertSettings", { ...args, updatedAt: Date.now() });
    }
  },
});
