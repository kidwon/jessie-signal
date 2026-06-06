// Clerk auth provider for Convex. The issuer domain is supplied via the
// CLERK_JWT_ISSUER_DOMAIN env var (set with `npx convex env set`). When it is
// absent the providers list is empty, so auth is simply inactive and pushes
// still succeed — keeping login optional and the deployment unbreakable.
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: domain ? [{ domain, applicationID: "convex" }] : [],
};
