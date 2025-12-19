'use client';

import { Link, usePathname } from '@/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Clapperboard, Settings, ArrowLeft } from 'lucide-react';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem, SidebarToggle } from '@/components/layout/sidebar/Sidebar';
import { useUIStore } from '@/store/useUIStore';

interface ProjectLayoutProps {
    children: React.ReactNode;
    projectId: string;
    projectTitle?: string;
}

export default function ProjectLayout({ children, projectId, projectTitle }: ProjectLayoutProps) {
    const pathname = usePathname();
    const { isSidebarCollapsed } = useUIStore();

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
                    {/* Header / Back */}
                    <div className={cn("flex flex-col gap-4", isSidebarCollapsed && "items-center")}>
                        <Link
                            href="/dashboard"
                            className={cn(
                                "flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium",
                                isSidebarCollapsed ? "justify-center w-10 h-10 hover:bg-white/10 rounded-lg" : ""
                            )}
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={isSidebarCollapsed ? 20 : 16} />
                            {!isSidebarCollapsed && <span>Back to Dashboard</span>}
                        </Link>

                        {!isSidebarCollapsed && projectTitle && (
                            <div className="px-1 animate-in fade-in">
                                <h2 className="text-white font-bold truncate text-lg" title={projectTitle}>
                                    {projectTitle}
                                </h2>
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
