'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const { register, handleSubmit } = useForm();
    const router = useRouter();
    const setToken = useAuthStore((state) => state.setToken);
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        try {
            // Form Data for OAuth2
            const formData = new URLSearchParams();
            formData.append('username', data.email);
            formData.append('password', data.password);

            const res = await api.post('/auth/login/access-token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            setToken(res.data.access_token);
            router.push('/');
        } catch (err) {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="mb-6 text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    Director Login
                </h2>

                {error && <p className="mb-4 text-red-500 text-center">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">Email</label>
                        <input
                            {...register('email')}
                            data-testid="login-email"
                            type="email"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">Password</label>
                        <input
                            {...register('password')}
                            data-testid="login-password"
                            type="password"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>
                    <Button type="submit" data-testid="login-submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Enter Studio
                    </Button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-500">
                    Don't have a workspace? <Link href="/signup" className="text-purple-400 hover:text-purple-300">Create one</Link>
                </p>
            </div>
        </div>
    );
}
