import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  visits: defineTable({
    timestamp: v.number(),
    lang: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),
});
