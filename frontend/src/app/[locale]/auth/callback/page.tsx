'use client';

import { useEffect } from 'react';
import { useRouter } from '@/navigation'; // Use localized router
import { useUser } from '@clerk/nextjs';
import axios from 'axios';

export default function AuthCallbackPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded) {
            if (!isSignedIn) {
                router.push('/login');
            } else {
                // Trigger Sync
                axios.post('/api/auth/sync')
                    .then(() => {
                        // Success -> Dashboard
                        router.push('/dashboard');
                    })
                    .catch((err) => {
                        console.error("Sync failed", err);
                        // Fallback -> Dashboard (maybe sync happened or transient error)
                        // Ideally we show an error, but blocking login is annoying.
                        // Backend ensures essential data on sync.
                        router.push('/dashboard');
                    });
            }
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <h2 className="text-xl mb-4">Setting up your workspace...</h2>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
        </div>
    );
}
