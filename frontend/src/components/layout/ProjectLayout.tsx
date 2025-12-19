'use client';

import { Link, usePathname } from '@/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Clapperboard, Settings, ArrowLeft, Coins, Plus } from 'lucide-react';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem, SidebarToggle } from '@/components/layout/sidebar/Sidebar';
import { useUIStore } from '@/store/useUIStore';
import { useEffect, useState } from 'react';
import RechargeModal from '@/components/dashboard/RechargeModal';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTranslations } from 'next-intl';

interface ProjectLayoutProps {
    children: React.ReactNode;
    projectId: string;
    projectTitle?: string;
}

export default function ProjectLayout({ children, projectId, projectTitle }: ProjectLayoutProps) {
    const pathname = usePathname();
    const { isSidebarCollapsed } = useUIStore();
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
            {/* Project Sidebar */}
            <Sidebar>
                <SidebarHeader>
                    {/* Back to Dashboard */}
                    <Link
                        href="/dashboard"
                        className={cn(
                            "flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium px-2 py-2 mb-2 hover:bg-[#15151A] rounded-lg",
                            isSidebarCollapsed ? "justify-center w-10 h-10 p-0" : ""
                        )}
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={isSidebarCollapsed ? 20 : 16} />
                        {!isSidebarCollapsed && <span>Back to Dashboard</span>}
                    </Link>

                    {/* Workspace Info (Read-only) */}
                    <div className="mb-2 mt-4 px-2">
                        {!isSidebarCollapsed ? (
                            <div className="w-full bg-[#15151A] rounded-xl p-3 border border-gray-800">
                                <div className="text-sm font-semibold text-gray-200 truncate mb-1.5">
                                    {currentWorkspace?.name || '...'}
                                </div>
                                <div
                                    className="inline-flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded-md text-yellow-500 text-xs font-semibold hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors cursor-pointer shadow-sm"
                                    onClick={() => setIsRechargeModalOpen(true)}
                                >
                                    <Coins size={12} />
                                    <span>{currentWorkspace?.credits.toLocaleString() || 0} Cr</span>
                                    <Plus size={10} className="bg-yellow-500/20 rounded-full p-0.5" />
                                </div>
                            </div>
                        ) : (
                            <div
                                className="size-10 mx-auto rounded-xl bg-[#15151A] hover:bg-[#1A1A20] border border-gray-800 flex items-center justify-center text-yellow-500 cursor-pointer transition-colors"
                                onClick={() => setIsRechargeModalOpen(true)}
                                title={currentWorkspace ? `${currentWorkspace.name}: ${currentWorkspace.credits} Cr` : 'Credits'}
                            >
                                <Coins size={18} />
                            </div>
                        )}
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
                    <SidebarItem
                        icon={Settings}
                        label="Project Settings"
                        // Add href or onClick when implemented
                        className="cursor-pointer"
                    />

                    {/* Modals */}
                    <RechargeModal
                        open={isRechargeModalOpen}
                        onOpenChange={setIsRechargeModalOpen}
                    />
                </SidebarFooter>

                <SidebarToggle />
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 min-w-0 bg-[#0A0A0B] relative">
                {children}
            </main>
        </div>
    );
}
