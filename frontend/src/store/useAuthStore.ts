import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    language?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    authProvider: 'legacy' | 'clerk';
    hasHydrated: boolean;
    isLoggingOut: boolean;
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    setAuthProvider: (provider: 'legacy' | 'clerk') => void;
    setHasHydrated: (state: boolean) => void;
    logout: () => Promise<void>;
    clearAuthState: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            authProvider: 'legacy',
            hasHydrated: false,
            isLoggingOut: false,
            setToken: (token) => set({ token }),
            setUser: (user) => set({ user }),
            setAuthProvider: (provider) => set({ authProvider: provider }),
            setHasHydrated: (state) => set({ hasHydrated: state }),
            // Clear auth state without redirect (for use by AuthProvider when Clerk handles logout)
            clearAuthState: () => {
                set({ token: null, user: null, authProvider: 'legacy' });
            },
            logout: async () => {
                // Prevent duplicate logout calls (infinite loop protection)
                if (get().isLoggingOut) {
                    console.log('[AuthStore] Logout already in progress, skipping duplicate call');
                    return;
                }
                
                set({ isLoggingOut: true });
                console.log('[AuthStore] Starting logout process');
                
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                    console.error("Failed to logout server-side", e);
                }
                
                // Clear local state
                set({ token: null, user: null, authProvider: 'legacy' });
                
                // Small delay to ensure state is cleared before redirect
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Redirect to login page
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            },
        }),
        {
            name: 'auth-storage', // unique name
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
