import { useAuth } from '../context/AuthContext.jsx';

/**
 * useClerkBridge
 * --------------
 * Preserved for backwards compatibility with callers (e.g. App.jsx).
 * Synchronization lifecycle and loading state coordination are now managed
 * natively within AuthProvider to eliminate inter-hook race conditions:
 * AuthContext exposes loading = true until either Clerk reports "not signed in"
 * definitively, or the backend session sync completes with the user set.
 */
export function useClerkBridge() {
  return useAuth();
}

