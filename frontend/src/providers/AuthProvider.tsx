'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { token, logout, setUser, setToken, setAuthProvider } = useAuthStore();
    const { user: clerkUser, isLoaded } = useUser();
    const isSyncing = useRef(false);

    useEffect(() => {
        const verifySession = async () => {
            if (!token) return;

            try {
                // Verify token and get latest user data
                const response = await api.get('/users/me');
                setUser(response.data);
            } catch (error) {
                // api.ts interceptor handles 401/403, but we can add fallback here
                console.error("Session verification failed", error);
            }
        };

        verifySession();
    }, [token, setUser]);

    // Sync Clerk User with Backend
    useEffect(() => {
        const syncClerkUser = async () => {
            // Only sync if:
            // 1. Clerk is loaded and we have a user
            // 2. We don't have a backend token yet (or we want to ensure it matches?)
            //    For now, only if missing token to avoid duplicate calls.
            // 3. Not already syncing
            if (!isLoaded || !clerkUser || token || isSyncing.current) return;

            isSyncing.current = true;
            try {
                const res = await axios.post('/api/auth/sync');
                const { access_token, user } = res.data;

                if (access_token) {
                    setToken(access_token);
                    setAuthProvider('clerk');
                    setUser(user);
                }
            } catch (error) {
                console.error("Failed to sync Clerk user with backend:", error);
            } finally {
                isSyncing.current = false;
            }
        };

        syncClerkUser();
    }, [isLoaded, clerkUser, token, setToken, setUser]);

    return <>{children}</>;
}
