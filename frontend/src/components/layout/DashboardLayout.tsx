'use client';

import { Link, usePathname, useRouter } from '@/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { cn } from '@/lib/utils';
import { LayoutDashboard, LayoutTemplate, Settings, Plus, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import CreateWorkspaceModal from '@/components/dashboard/CreateWorkspaceModal';
import RechargeModal from '@/components/dashboard/RechargeModal';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem, SidebarToggle } from '@/components/layout/sidebar/Sidebar';
import WorkspaceSelector from '@/components/layout/sidebar/WorkspaceSelector';
import { useUIStore } from '@/store/useUIStore';
import SidebarUserProfile from '@/components/layout/sidebar/SidebarUserProfile';

import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface DashboardLayoutProps {
    children: React.ReactNode;
    accessToken?: string;
}

export default function DashboardLayout({ children, accessToken }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname() || '';
    const { user, token, hasHydrated, setToken } = useAuthStore();
    const t = useTranslations('Dashboard');
    const tErrors = useTranslations('Errors');
    const { toast } = useToast();

    // Server-Side Token Sync
    if (accessToken && !token) {
        // Direct state mutation or use store (using store inside render is discouraged usually, 
        // but for hydration sync it might be okay or use useEffect)
    }

    useEffect(() => {
        if (accessToken && accessToken !== token) {
            setToken(accessToken);
        }
    }, [accessToken, token, setToken]);

    // Only need fetchWorkspaces to initialize data
    const { fetchWorkspaces } = useWorkspaceStore();

    // UI State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

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

    const { isSidebarCollapsed } = useUIStore();

    const navItems = [
        { name: t('nav.projects'), href: '/dashboard', icon: LayoutDashboard, exact: true },
        { name: t('nav.styles'), href: '/dashboard/styles', icon: Palette },
        { name: t('nav.templates'), href: '/templates', icon: LayoutTemplate },
        { name: t('nav.settings'), href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen w-full bg-[#0A0A0B] font-display text-gray-900 dark:text-white">
            <Sidebar>
                <SidebarHeader>
                    {/* Logo Area */}
                    <Link href="/dashboard" className={cn("flex items-center gap-3 px-2 hover:opacity-80 transition-opacity", isSidebarCollapsed && "justify-center")}>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shadow-sm shrink-0" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBN5z1oDmeTFxQPTUuZqFXRVrFpjy9QgdgN7rv824MDXj0NTjJf2cUSjH7YeclTy1qA7RfMULzL6lGPB0I4bZHNNHrSkeRlsh8ShZdCrhnIOWQrexQX3xL1OC7CAWTqbG9zjPeN6nxXKNfnX7EL9jlzWM3lPPERGqxmt9W6cV5zdFUyxhV086nH2nspTA8NdBpwgv32ZZe6ILXWL6fWCGG7q9dHiEZH9OCuBdZ3TVK_QRzEx4ItSKvZ0B4FeqhlaveTmuZFH9g2Gls")' }}></div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col animate-in fade-in duration-300">
                                <h1 className="text-white text-base font-medium leading-normal">Toonify</h1>
                                <p className="text-gray-400 text-sm font-normal leading-normal">{t('subtitle')}</p>
                            </div>
                        )}
                    </Link>

                    {/* Workspace Selector */}
                    <WorkspaceSelector
                        onOpenCreateWorkspace={() => setIsCreateModalOpen(true)}
                        onOpenRecharge={() => setIsRechargeModalOpen(true)}
                        isCollapsed={isSidebarCollapsed}
                    />

                    {/* New Project Button */}
                    <div className="px-1 mt-1 mb-2">
                        <Link href="/new-project">
                            <div className={cn(
                                "w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                                isSidebarCollapsed ? "h-10 w-10 p-0 mx-auto aspect-square" : "p-3 gap-2"
                            )} title={isSidebarCollapsed ? t('newProject') : undefined}>
                                <Plus size={isSidebarCollapsed ? 20 : 16} strokeWidth={3} />
                                {!isSidebarCollapsed && <span className="pt-[1px]">{t('newProject')}</span>}
                            </div>
                        </Link>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.href}
                            {...item}
                            label={item.name}
                        />
                    ))}
                </SidebarContent>

                <SidebarFooter>
                    {/* Profile Section */}
                    <SidebarUserProfile />

                    <CreateWorkspaceModal
                        open={isCreateModalOpen}
                        onOpenChange={setIsCreateModalOpen}
                    />
                    <RechargeModal
                        open={isRechargeModalOpen}
                        onOpenChange={setIsRechargeModalOpen}
                    />
                </SidebarFooter>

                <SidebarToggle />
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[#0A0A0B]">
                {children}
            </main>
        </div>
    );
}
