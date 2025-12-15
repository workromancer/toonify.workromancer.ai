'use client';

import { Link, useRouter } from '@/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function Home() {
    const { token, logout } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const t = useTranslations('Landing');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
            <h1 className="text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                Toonify
            </h1>
            <p className="text-xl text-gray-400 mb-8">{t('subtitle')}</p>

            {token ? (
                <div className="space-y-4 text-center">
                    <p className="text-green-400">{t('loggedIn')}</p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>
                            {t('dashboard')}
                        </Button>
                        <Button variant="destructive" onClick={logout}>
                            {t('logout')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-4">
                    <Link href="/login">
                        <Button className="bg-purple-600 hover:bg-purple-700">{t('login')}</Button>
                    </Link>
                    <Link href="/signup">
                        <Button variant="outline">{t('signup')}</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
