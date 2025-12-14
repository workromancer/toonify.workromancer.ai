'use client';

import { useEffect, useState, useTransition } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CreditCard, Shield, Globe, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const { user, setUser } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleLanguageChange = async (newLanguage: string) => {
        if (newLanguage === locale) return;

        startTransition(async () => {
            try {
                // Update backend
                if (user) {
                    const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/me`, {
                        language: newLanguage
                    }, {
                        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
                    });
                    
                    if (response.data) {
                         setUser({ ...user, language: newLanguage });
                    }
                }

                // Redirect to new locale
                // Simple replacement assuming locale is always first segment or handled by middleware
                // For a more robust solution with next-intl, one might use createSharedPathnamesNavigation
                // But for now, we'll brute force replace the first segment if it matches a locale, or prepend
                
                const segments = pathname.split('/');
                if (['en', 'ko'].includes(segments[1])) {
                    segments[1] = newLanguage;
                } else {
                    segments.splice(1, 0, newLanguage);
                }
                const newPath = segments.join('/');
                router.replace(newPath);
                router.refresh();

            } catch (error) {
                console.error("Failed to update language", error);
                toast({
                    title: "Error",
                    description: "Failed to update language preference.",
                    variant: "destructive"
                });
            }
        });
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('description')}</p>
                </header>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                                <User size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('profile')}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('profileDescription')}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('email')}</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('userId')}</label>
                                <input
                                    type="text"
                                    value={user?.id || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 font-mono text-sm"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('language')}</label>
                                <div className="flex gap-2">
                                    <Button 
                                        variant={locale === 'en' ? 'default' : 'outline'}
                                        onClick={() => handleLanguageChange('en')}
                                        disabled={isPending}
                                        className="w-24"
                                    >
                                        {isPending && locale !== 'en' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        English
                                    </Button>
                                    <Button 
                                        variant={locale === 'ko' ? 'default' : 'outline'}
                                        onClick={() => handleLanguageChange('ko')}
                                        disabled={isPending}
                                        className="w-24"
                                    >
                                        {isPending && locale !== 'ko' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        한국어
                                    </Button>
                                </div>
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
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('workspace')} {currentWorkspace.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('workspaceDescription')}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="text-gray-400" size={16} />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('currentPlan')}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{currentWorkspace.tier}</p>
                                    <Button variant="link" className="p-0 h-auto text-primary mt-2">{t('upgradePlan')}</Button>
                                </div>

                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="size-4 rounded-full bg-yellow-400" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('creditsAvailable')}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentWorkspace.credits}</p>
                                    <Button variant="link" className="p-0 h-auto text-primary mt-2">{t('purchaseCredits')}</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
