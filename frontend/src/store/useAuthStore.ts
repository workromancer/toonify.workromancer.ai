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
    hasHydrated: boolean;
    setToken: (token: string) => void;
    setUser: (user: User) => void;
    setHasHydrated: (state: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            hasHydrated: false,
            setToken: (token) => set({ token }),
            setUser: (user) => set({ user }),
            setHasHydrated: (state) => set({ hasHydrated: state }),
            logout: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth-storage', // unique name
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
