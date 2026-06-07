import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Is the signed-in user subscribed? (false when not authenticated.)
export const mySubscription = query({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) return false;
    const row = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("clerkUserId", id.subject))
      .first();
    return row !== null;
  },
});

export const subscribe = mutation({
  args: { lang: v.optional(v.string()) },
  handler: async (ctx, { lang }) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new Error("Not authenticated");
    const email = id.email;
    if (!email) throw new Error("No email on account"); // needs email claim in JWT
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("clerkUserId", id.subject))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { email, lang });
    } else {
      await ctx.db.insert("subscriptions", {
        clerkUserId: id.subject,
        email,
        lang,
        createdAt: Date.now(),
      });
    }
  },
});

export const unsubscribe = mutation({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("clerkUserId", id.subject))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// Internal: recipient list for the notify action.
export const listSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("subscriptions").collect();
    return rows.map((r) => ({ email: r.email, lang: r.lang ?? "en" }));
  },
});
