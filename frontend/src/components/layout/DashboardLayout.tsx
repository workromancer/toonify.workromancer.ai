'use client';

import { Link, usePathname, useRouter } from '@/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LayoutTemplate, Image as ImageIcon, Settings, LogOut, HelpCircle, Coins, Plus, ChevronDown, Check, Palette } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import CreateWorkspaceModal from '@/components/dashboard/CreateWorkspaceModal';
import RechargeModal from '@/components/dashboard/RechargeModal';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface DashboardLayoutProps {
    children: React.ReactNode;
    accessToken?: string;
}

export default function DashboardLayout({ children, accessToken }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname() || '';
    const { logout, user, token, hasHydrated, setToken } = useAuthStore();
    const t = useTranslations('Dashboard');
    const tErrors = useTranslations('Errors');
    const { toast } = useToast();

    // Server-Side Token Sync
    // If server provides a token (from cookie), sync it to the store immediately
    // This allows API calls to work even if localStorage is empty
    if (accessToken && !token) {
        // Direct state mutation or use store (using store inside render is discouraged usually, 
        // but for hydration sync it might be okay or use useEffect)
        // Better to use useEffect.
    }

    useEffect(() => {
        if (accessToken && accessToken !== token) {
            setToken(accessToken);
        }
    }, [accessToken, token, setToken]);

    // ... (keep handleLogout)

    const handleLogout = () => {
        logout();
        router.push('/login');
    };
    const { currentWorkspace, workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

    // UI State
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsWorkspaceOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen for Recharge Event
    useEffect(() => {
        const handleOpenRecharge = () => setIsRechargeModalOpen(true);
        window.addEventListener('open-recharge-modal', handleOpenRecharge);
        return () => window.removeEventListener('open-recharge-modal', handleOpenRecharge);
    }, []);

    // Listen for API Errors
    useEffect(() => {
        const handleApiError = (event: CustomEvent) => {
            const { type, message } = event.detail;
            let titleKey = 'defaultTitle';
            let descKey = 'defaultMessage';
            let customDesc = message;

            switch (type) {
                case 'sessionExpired':
                    titleKey = 'sessionExpired';
                    descKey = 'sessionExpiredDesc';
                    break;
                case 'accessDenied':
                    titleKey = 'accessDenied';
                    descKey = 'accessDeniedDesc';
                    break;
                case 'notFound':
                    titleKey = 'notFound';
                    descKey = 'notFoundDesc';
                    break;
                case 'insufficientCredits':
                    titleKey = 'insufficientCredits';
                    descKey = 'insufficientCreditsDesc';
                    break;
                case 'validationError':
                    titleKey = 'validationError';
                    descKey = 'invalidInput'; // Default fallback
                    break;
                case 'serverError':
                    titleKey = 'serverError';
                    descKey = 'serverErrorDesc';
                    break;
                case 'networkError':
                    titleKey = 'networkError';
                    descKey = 'networkErrorDesc';
                    break;
                default:
                    break;
            }

            toast({
                title: tErrors(titleKey),
                description: customDesc || tErrors(descKey),
                variant: 'destructive',
            });
        };

        window.addEventListener('api-error', handleApiError as EventListener);
        return () => window.removeEventListener('api-error', handleApiError as EventListener);
    }, []);

    // Auth Guard Logic
    useEffect(() => {
        // If we have a server token, we are authenticated.
        if (accessToken) return;

        // Only redirect if we have finished hydrating and still have no token (and no server token)
        if (hasHydrated && !token) {
            router.push('/login');
        }
    }, [hasHydrated, token, router, accessToken]);

    // Data Fetching
    useEffect(() => {
        if ((hasHydrated && token) || accessToken) {
            fetchWorkspaces();
        }
    }, [hasHydrated, token, accessToken]);

    // Waiting for hydration
    // If we have a server token, we don't need to wait for client hydration to show the page
    if (!hasHydrated && !accessToken) {
        return <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0B] text-white">Loading...</div>;
    }

    // If hydrated but no token, return null (guard will redirect)
    // But if we have accessToken, we are good
    if (!token && !accessToken) return null;

    const navItems = [
        { name: t('nav.projects'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.styles'), href: '/dashboard/styles', icon: Palette },
        { name: t('nav.templates'), href: '/dashboard/templates', icon: LayoutTemplate },
        { name: t('nav.assets'), href: '/dashboard/assets', icon: ImageIcon },
        { name: t('nav.settings'), href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen w-full bg-[#0A0A0B] font-display text-gray-900 dark:text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0F0F12] border-r border-gray-800 flex flex-col sticky top-0 h-screen p-4">
                <div className="flex flex-col gap-4">
                    {/* Logo Area */}
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 hover:opacity-80 transition-opacity">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBN5z1oDmeTFxQPTUuZqFXRVrFpjy9QgdgN7rv824MDXj0NTjJf2cUSjH7YeclTy1qA7RfMULzL6lGPB0I4bZHNNHrSkeRlsh8ShZdCrhnIOWQrexQX3xL1OC7CAWTqbG9zjPeN6nxXKNfnX7EL9jlzWM3lPPERGqxmt9W6cV5zdFUyxhV086nH2nspTA8NdBpwgv32ZZe6ILXWL6fWCGG7q9dHiEZH9OCuBdZ3TVK_QRzEx4ItSKvZ0B4FeqhlaveTmuZFH9g2Gls")' }}></div>
                        <div className="flex flex-col">
                            <h1 className="text-gray-900 dark:text-white text-base font-medium leading-normal">Toonify</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{t('subtitle')}</p>
                        </div>
                    </Link>

                    {/* Workspace/Credit Info */}
                    {/* Workspace/Credit Info - Switcher */}
                    {currentWorkspace && (
                        <div className="relative mx-1" ref={dropdownRef}>
                            <button
                                onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                                className="w-full flex items-center justify-between text-left bg-[#15151A] dark:bg-gray-800/30 rounded-lg p-3 border border-gray-800 dark:border-gray-700 backdrop-blur-sm hover:bg-[#1A1A20] dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mb-1">
                                        {currentWorkspace.name}
                                    </div>
                                    <div
                                        className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs font-semibold hover:text-yellow-300 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsRechargeModalOpen(true);
                                        }}
                                    >
                                        <Coins size={12} />
                                        <span>{t('workspace.credits', { count: currentWorkspace.credits })}</span>
                                        <Plus size={10} className="bg-yellow-500/20 rounded-full p-0.5" />
                                    </div>
                                </div>
                                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isWorkspaceOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('workspace.switch')}
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {workspaces.map((ws) => (
                                            <button
                                                key={ws.id}
                                                onClick={() => {
                                                    setCurrentWorkspace(ws);
                                                    setIsWorkspaceOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                                            >
                                                <span className="truncate">{ws.name}</span>
                                                {ws.id === currentWorkspace.id && <Check size={14} className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />
                                    <button
                                        onClick={() => {
                                            setIsCreateModalOpen(true);
                                            setIsWorkspaceOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary transition-colors text-left font-medium"
                                    >
                                        <Plus size={14} />
                                        {t('workspace.create')}
                                    </button>
                                    <Link
                                        href="/dashboard/settings"
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary transition-colors text-left font-medium"
                                        onClick={() => setIsWorkspaceOpen(false)}
                                    >
                                        <Settings size={14} />
                                        {t('workspace.settings')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Global New Project Button */}
                    <div className="px-1 mt-3 mb-6">
                        <Link href="/new-project">
                            <div className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                                <Plus size={16} strokeWidth={3} />
                                <span className="pt-[1px]">{t('newProject')}</span>
                            </div>
                        </Link>
                    </div>

                    {/* Main Navigation */}
                    <nav className="flex flex-col gap-1 mt-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                            return (
                                <Link key={item.href} href={item.href}>
                                    <div className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium border border-transparent",
                                        isActive
                                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                            : "text-gray-500 hover:bg-[#15151A] hover:text-white"
                                    )}>
                                        <Icon size={20} className={cn(isActive ? "text-purple-400" : "text-gray-500")} />
                                        <span>{item.name}</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </nav>


                </div>

                <div className="mt-auto flex flex-col gap-1">
                    <Link href="/help" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                        <HelpCircle size={20} className="text-gray-500 dark:text-gray-500" />
                        <p className="text-gray-800 dark:text-white text-sm font-medium leading-normal">{t('nav.help')}</p>
                    </Link>

                    {/* Profile Section */}
                    <div className="flex items-center justify-between p-3 mt-2 border-t border-gray-800">
                        <Link href="/dashboard/settings" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 shrink-0" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDt162HoprwUvAfkIffAk7g_psL0UaRy25zgFtGaXcXyJz630egcVpIYDzYA0ixPxpVPquJLNEx4ZV74u4Bz7hTYnD9FqwuLTBLiyiG10hudXU1ScUybYIokJira71mt4ZaujtmgVCAKCBS2OanpmP0MIDIKs4x2kA6x9M1Es0Tyrvy12jCdsCzHFNSK9bNSsG4vcsF_ZAc6ynihPA35wHzJSvE4ybOejxdtr5pKz7E5E3jnU-92N1dtbTLPiYpcvKnPAZzjRGsc3U")' }}></div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-gray-900 dark:text-white text-sm font-medium leading-normal truncate">{user?.email?.split('@')[0] || "Guest"}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal truncate">{user?.email || "guest@toonify.com"}</p>
                            </div>
                        </Link>
                        <div className="flex items-center gap-1">
                            <LanguageSwitcher />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                                onClick={handleLogout}
                            >
                                <LogOut size={18} />
                            </Button>
                        </div>
                    </div>

                    <CreateWorkspaceModal
                        open={isCreateModalOpen}
                        onOpenChange={setIsCreateModalOpen}
                    />
                    <RechargeModal
                        open={isRechargeModalOpen}
                        onOpenChange={setIsRechargeModalOpen}
                    />
                </div >
            </aside >

            {/* Main Content */}
            < main className="flex-1 overflow-auto bg-[#0A0A0B]" >
                {children}
            </main >
        </div >
    );
}
