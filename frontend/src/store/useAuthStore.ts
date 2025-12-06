import { create } from 'zustand';

interface User {
    id: string;
    email: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    setToken: (token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    user: null, // We could persist this too, but for now simple.
    setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token });
    },
    setUser: (user) => set({ user }),
    logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null });
    },
}));
