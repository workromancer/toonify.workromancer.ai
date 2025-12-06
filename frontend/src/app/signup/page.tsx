'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
    const { register, handleSubmit } = useForm();
    const router = useRouter();
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        try {
            await api.post('/auth/signup', {
                email: data.email,
                password: data.password,
                username: data.email.split('@')[0]
            });
            router.push('/login');
        } catch (err: any) {
            if (err.response && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Signup failed. Please try again.');
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="mb-6 text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                    New Workspace
                </h2>

                {error && <p className="mb-4 text-red-500 text-center">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">Email</label>
                        <input
                            {...register('email')}
                            type="email"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">Password</label>
                        <input
                            {...register('password')}
                            type="password"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-green-500"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        Create Workspace
                    </Button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-500">
                    Already a director? <Link href="/login" className="text-blue-400 hover:text-blue-300">Login</Link>
                </p>
            </div>
        </div>
    );
}
