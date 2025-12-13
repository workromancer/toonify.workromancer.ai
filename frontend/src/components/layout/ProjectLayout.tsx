'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Clapperboard, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectLayoutProps {
    children: React.ReactNode;
    projectId: string;
    projectTitle?: string;
}

export default function ProjectLayout({ children, projectId, projectTitle }: ProjectLayoutProps) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Overview', href: `/project/${projectId}`, icon: LayoutDashboard, exact: true },
        { name: 'Characters', href: `/project/${projectId}/characters`, icon: Users, exact: false },
        { name: 'Storyboard', href: `/project/${projectId}/storyboard`, icon: Clapperboard, exact: false },
    ];

    return (
        <div className="flex h-full min-h-screen bg-[#0A0A0B]">
            {/* Project Sidebar */}
            <aside className="w-64 bg-[#0F0F12] border-r border-gray-800 flex flex-col sticky top-0 h-screen shrink-0">
                
                {/* Header / Back */}
                <div className="p-4 border-b border-gray-800">
                    <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium mb-4">
                        <ArrowLeft size={16} />
                        <span>Back to Dashboard</span>
                    </Link>
                    {projectTitle && (
                        <h2 className="text-white font-bold truncate" title={projectTitle}>
                            {projectTitle}
                        </h2>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.exact 
                            ? pathname === item.href 
                            : pathname?.startsWith(item.href);

                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20"
                                        : "text-gray-400 hover:text-white hover:bg-[#15151A] border border-transparent"
                                )}>
                                    <Icon size={18} className={cn(
                                        "transition-colors",
                                        isActive ? "text-purple-400" : "text-gray-500 group-hover:text-gray-300"
                                    )} />
                                    <span className="text-sm">{item.name}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Settings? */}
                <div className="p-3 border-t border-gray-800">
                    <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#15151A] cursor-pointer transition-colors"
                    )}>
                         <Settings size={18} />
                         <span className="text-sm">Project Settings</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 bg-[#0A0A0B] relative">
               {children}
            </main>
        </div>
    );
}
