// Centralized Clerk config. Auth is optional: when the publishable key is not
// set, clerkEnabled is false and the app renders without any Clerk dependency.
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
export const clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY)
