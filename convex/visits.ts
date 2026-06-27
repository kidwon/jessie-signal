import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
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

// True if this IP was already recorded today. Lets the HTTP action skip the
// GeoIP lookup for repeat visitors.
export const wasVisitedToday = internalQuery({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await ctx.db
      .query("visits")
      .withIndex("by_ip", (q) =>
        q.eq("ip", ip).gte("timestamp", todayStart.getTime()),
      )
      .first();
    return existing !== null;
  },
});

// Records a visit, deduped per IP per (UTC) day. Internal: only callable from
// the /api/visit HTTP action, which supplies the real client IP and resolved
// country — keeping both unspoofable by direct client calls.
export const recordVisit = internalMutation({
  args: {
    ip: v.string(),
    lang: v.optional(v.string()),
    country: v.optional(v.string()),
  },
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
      country: args.country,
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

// Whether the signed-in user's email is in the ADMIN_EMAILS allowlist
// (comma-separated Convex env var). Requires the Clerk "convex" JWT template to
// include the email claim. Returns false when not signed in / no email.
export async function isAdminIdentity(ctx: { auth: { getUserIdentity: () => Promise<{ email?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.toLowerCase();
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email);
}

// Safe to expose: lets the UI decide whether to show the admin entry.
export const isAdmin = query({
  args: {},
  handler: async (ctx) => isAdminIdentity(ctx),
});

// Admin-only: returns recent visits including IP. Gated on the backend so the
// IP log can never be read by non-admins, regardless of the UI.
export const listRecentVisits = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminIdentity(ctx))) throw new Error("Not authorized");
    const rows = await ctx.db
      .query("visits")
      .withIndex("by_timestamp")
      .order("desc")
      .take(200);
    return rows.map((r) => ({
      _id: r._id,
      timestamp: r.timestamp,
      ip: r.ip ?? null,
      country: r.country ?? null,
      lang: r.lang ?? null,
    }));
  },
});
