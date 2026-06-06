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
