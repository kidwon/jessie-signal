import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { CLERK_PUBLISHABLE_KEY, clerkEnabled } from './clerk'
import './index.css'
import App from './App.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

// When Clerk is configured, wire it through Convex so the backend can identify
// the user. Otherwise fall back to a plain Convex provider — the public
// dashboard works either way (login is never required).
const tree = clerkEnabled ? (
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
) : (
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>{tree}</StrictMode>,
)
