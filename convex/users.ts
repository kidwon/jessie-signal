import { action } from "./_generated/server";
import { v } from "convex/values";

type AuthCtx = { auth: { getUserIdentity: () => Promise<{ email?: string } | null> } };

async function isAdmin(ctx: AuthCtx): Promise<boolean> {
  const id = await ctx.auth.getUserIdentity();
  const email = id?.email?.toLowerCase();
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email);
}

// Admin-only: list Clerk users via the Clerk Backend API. We don't mirror users
// into Convex, so this reads them live (needs CLERK_SECRET_KEY).
export const listUsers = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) throw new Error("Not authorized");
    const key = process.env.CLERK_SECRET_KEY;
    if (!key) return [];

    const res = await fetch(
      "https://api.clerk.com/v1/users?limit=100&order_by=-created_at",
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return [];

    const users = (await res.json()) as Array<{
      id: string;
      email_addresses?: Array<{ id: string; email_address: string }>;
      primary_email_address_id?: string;
      first_name?: string | null;
      last_name?: string | null;
      created_at?: number;
      last_sign_in_at?: number | null;
    }>;

    return users.map((u) => {
      const emails = u.email_addresses ?? [];
      const primary = emails.find((e) => e.id === u.primary_email_address_id) ?? emails[0];
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
      return {
        id: u.id,
        email: primary?.email_address ?? null,
        name: name || null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      };
    });
  },
});
