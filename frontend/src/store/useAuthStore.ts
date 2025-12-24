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
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    setAuthProvider: (provider: 'legacy' | 'clerk') => void;
    setHasHydrated: (state: boolean) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            authProvider: 'legacy',
            hasHydrated: false,
            setToken: (token) => set({ token }),
            setUser: (user) => set({ user }),
            setAuthProvider: (provider) => set({ authProvider: provider }),
            setHasHydrated: (state) => set({ hasHydrated: state }),
            logout: async () => {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                    console.error("Failed to logout server-side", e);
                }
                set({ token: null, user: null, authProvider: 'legacy' });
                window.location.href = '/login';
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
