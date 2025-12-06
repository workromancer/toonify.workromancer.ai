'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Home() {
    const { token, logout } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
            <h1 className="text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                Toonify
            </h1>
            <p className="text-xl text-gray-400 mb-8">Be the Director.</p>

            {token ? (
                <div className="space-y-4 text-center">
                    <p className="text-green-400">Currently logged in.</p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>
                            Go to Dashboard
                        </Button>
                        <Button variant="destructive" onClick={logout}>
                            Logout
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-4">
                    <Link href="/login">
                        <Button className="bg-purple-600 hover:bg-purple-700">Login</Button>
                    </Link>
                    <Link href="/signup">
                        <Button variant="outline">Sign Up</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
