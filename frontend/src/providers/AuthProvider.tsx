'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { token, logout, setUser } = useAuthStore();

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

                // If it's a connection error or something not handled by interceptor yet
                // But generally interceptor does the job.
            }
        };

        verifySession();
    }, [token, setUser]);

    return <>{children}</>;
}
