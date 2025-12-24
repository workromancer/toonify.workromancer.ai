'use client';

import { Link, usePathname } from '@/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Clapperboard, ArrowLeft, Coins, Plus, Menu } from 'lucide-react';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem, SidebarToggle } from '@/components/layout/sidebar/Sidebar';
import { useUIStore } from '@/store/useUIStore';
import { useEffect, useState } from 'react';
import RechargeModal from '@/components/dashboard/RechargeModal';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTranslations } from 'next-intl';
import SidebarUserProfile from '@/components/layout/sidebar/SidebarUserProfile';
import WorkspaceSelector from '@/components/layout/sidebar/WorkspaceSelector';

interface ProjectLayoutProps {
    children: React.ReactNode;
    projectId: string;
    projectTitle?: string;
}

export default function ProjectLayout({ children, projectId, projectTitle }: ProjectLayoutProps) {
    const pathname = usePathname();
    const { isSidebarCollapsed, setMobileSidebarOpen } = useUIStore();
    const { fetchWorkspaces, currentWorkspace } = useWorkspaceStore();
    const t = useTranslations('Dashboard');

    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const navItems = [
        { name: 'Overview', href: `/project/${projectId}`, icon: LayoutDashboard, exact: true },
        { name: 'Characters', href: `/project/${projectId}/characters`, icon: Users, exact: false },
        { name: 'Episodes', href: `/project/${projectId}/episodes`, icon: Clapperboard, exact: false },
    ];

    return (
        <div className="flex h-full min-h-screen bg-[#0A0A0B]">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-[#0F0F12] border-b border-gray-800 flex items-center justify-between px-4 z-30 md:hidden">
                <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate max-w-[200px]">{projectTitle || 'Project'}</span>
                </div>
                <Link href="/dashboard" className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
            </header>

            {/* Project Sidebar */}
            <Sidebar>
                <SidebarHeader>
                    {/* Back to Dashboard */}
                    <Link
                        href="/dashboard"
                        className={cn(
                            "flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium px-2 py-2 mb-2 hover:bg-[#15151A] rounded-lg mt-8 md:mt-0",
                            isSidebarCollapsed ? "md:justify-center md:w-10 md:h-10 md:p-0" : ""
                        )}
                        title={t('backToDashboard')}
                    >
                        <ArrowLeft size={isSidebarCollapsed ? 20 : 16} />
                        <span className={cn(isSidebarCollapsed && "md:hidden")}>{t('backToDashboard')}</span>
                    </Link>

                    {/* Workspace Info (Read-only) */}
                    <div className="mb-2 mt-1">
                        <WorkspaceSelector
                            readOnly
                            isCollapsed={isSidebarCollapsed}
                            onOpenRecharge={() => setIsRechargeModalOpen(true)}
                        />
                    </div>
                </SidebarHeader>

                {/* Navigation */}
                <SidebarContent>
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.href}
                            {...item}
                            label={item.name}
                        />
                    ))}
                </SidebarContent>

                {/* Footer Settings */}
                <SidebarFooter>
                    {/* Profile Section */}
                    <SidebarUserProfile />

                    {/* Modals */}
                    <RechargeModal
                        open={isRechargeModalOpen}
                        onOpenChange={setIsRechargeModalOpen}
                    />
                </SidebarFooter>

                <SidebarToggle />
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 min-w-0 bg-[#0A0A0B] relative pt-14 md:pt-0">
                {children}
            </main>
        </div>
    );
}

