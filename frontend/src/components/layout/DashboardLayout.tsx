'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore'; // Added
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Settings, LogOut, Library, Coins } from 'lucide-react'; // Added Coins
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout, user } = useAuthStore();
    const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore(); // Added

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const navItems = [
        { name: 'Projects', href: '/dashboard', icon: Library },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                        Toonify
                    </h1>

                    {/* Workspace/Credit Info */}
                    {currentWorkspace && (
                        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                            <div className="text-sm font-medium text-gray-300 truncate mb-1">
                                {currentWorkspace.name}
                            </div>
                            <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
                                <Coins size={14} />
                                <span>{currentWorkspace.credits} Credits</span>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                                    isActive ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"
                                )}>
                                    <Icon size={20} />
                                    <span className="font-medium">{item.name}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <Button
                        variant="ghost"
                        className="w-full flex items-center gap-2 justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={logout}
                    >
                        <LogOut size={20} />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-black">
                {children}
            </main>
        </div>
    );
}
