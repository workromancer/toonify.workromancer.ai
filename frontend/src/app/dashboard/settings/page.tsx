'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Using mock UI or generic divs if card not avail
import { User, CreditCard, Shield } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your profile and workspace preferences.</p>
                </header>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                                <User size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Your personal account details</p>
                            </div>
                        </div>

                        <div className="grid gap-4 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
                                <input
                                    type="text"
                                    value={user?.id || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Workspace Section */}
                    {currentWorkspace && (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-purple-500/10 rounded-full text-purple-600">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Workspace: {currentWorkspace.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Plan and usage details</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="text-gray-400" size={16} />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Plan</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{currentWorkspace.tier}</p>
                                    <Button variant="link" className="p-0 h-auto text-primary mt-2">Upgrade Plan</Button>
                                </div>

                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="size-4 rounded-full bg-yellow-400" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Credits Available</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentWorkspace.credits}</p>
                                    <Button variant="link" className="p-0 h-auto text-primary mt-2">Purchase Credits</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
