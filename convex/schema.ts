import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  visits: defineTable({
    timestamp: v.number(),
    lang: v.optional(v.string()),
    ip: v.optional(v.string()),
    country: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_ip", ["ip", "timestamp"]),

  // Periodic time-series snapshots (written by the hourly cron during US
  // trading hours) — powers trend charts and roll-over detection.
  marketHistory: defineTable({
    timestamp: v.number(),
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
  }).index("by_timestamp", ["timestamp"]),

  // Logged-in users who opted into scenario-change email alerts.
  subscriptions: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    lang: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  // Single-row admin config: which target states trigger an alert email.
  // `scenarios` holds enabled scenario numbers (0–5); `fearGreed` holds enabled
  // F&G level labels (label_en). Absent row → all states enabled (see settings.ts).
  alertSettings: defineTable({
    scenarios: v.array(v.number()),
    fearGreed: v.array(v.string()),
    updatedAt: v.number(),
  }),

  // Single-row shared cache of the full computed signal payload, so page loads
  // render instantly instead of waiting on external APIs.
  marketCache: defineTable({
    data: v.any(),
    updatedAt: v.number(),
  }),

  marketState: defineTable({
    scenario: v.number(),
    name_zh: v.string(),
    name_en: v.string(),
    action_zh: v.string(),
    action_en: v.string(),
    color: v.string(),
    vix: v.number(),
    fg_score: v.number(),
    updated_at: v.number(),
  }),
});
