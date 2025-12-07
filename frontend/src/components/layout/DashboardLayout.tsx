'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LayoutTemplate, Image as ImageIcon, Settings, LogOut, HelpCircle, Coins } from 'lucide-react';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout, user } = useAuthStore();
    const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const navItems = [
        { name: 'My Projects', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Templates', href: '/templates', icon: LayoutTemplate },
        { name: 'Assets', href: '/assets', icon: ImageIcon },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-background-light dark:bg-background-dark border-r border-gray-200 dark:border-gray-800 flex flex-col sticky top-0 h-screen p-4">
                <div className="flex flex-col gap-4">
                    {/* Logo Area */}
                    <div className="flex items-center gap-3 px-3">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBN5z1oDmeTFxQPTUuZqFXRVrFpjy9QgdgN7rv824MDXj0NTjJf2cUSjH7YeclTy1qA7RfMULzL6lGPB0I4bZHNNHrSkeRlsh8ShZdCrhnIOWQrexQX3xL1OC7CAWTqbG9zjPeN6nxXKNfnX7EL9jlzWM3lPPERGqxmt9W6cV5zdFUyxhV086nH2nspTA8NdBpwgv32ZZe6ILXWL6fWCGG7q9dHiEZH9OCuBdZ3TVK_QRzEx4ItSKvZ0B4FeqhlaveTmuZFH9g2Gls")' }}></div>
                        <div className="flex flex-col">
                            <h1 className="text-gray-900 dark:text-white text-base font-medium leading-normal">Toonify</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">AI Webtoon Tool</p>
                        </div>
                    </div>

                    {/* Workspace/Credit Info */}
                    {currentWorkspace && (
                        <div className="bg-white/50 dark:bg-gray-800/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700 backdrop-blur-sm mx-1">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mb-1">
                                {currentWorkspace.name}
                            </div>
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">
                                <Coins size={12} />
                                <span>{currentWorkspace.credits} Credits</span>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex flex-col gap-1 mt-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            // Check for active state: exact match or starts with for sub-routes (mostly)
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                            return (
                                <Link key={item.href} href={item.href}>
                                    <div className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                                        isActive
                                            ? "bg-primary/10 dark:bg-primary/20 text-primary"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                                    )}>
                                        <Icon size={20} className={cn(isActive ? "text-primary" : "text-gray-500 dark:text-gray-500")} />
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
                        <p className="text-gray-800 dark:text-white text-sm font-medium leading-normal">Help</p>
                    </Link>

                    {/* Profile Section */}
                    <div className="flex items-center justify-between p-3 mt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 shrink-0" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDt162HoprwUvAfkIffAk7g_psL0UaRy25zgFtGaXcXyJz630egcVpIYDzYA0ixPxpVPquJLNEx4ZV74u4Bz7hTYnD9FqwuLTBLiyiG10hudXU1ScUybYIokJira71mt4ZaujtmgVCAKCBS2OanpmP0MIDIKs4x2kA6x9M1Es0Tyrvy12jCdsCzHFNSK9bNSsG4vcsF_ZAc6ynihPA35wHzJSvE4ybOejxdtr5pKz7E5E3jnU-92N1dtbTLPiYpcvKnPAZzjRGsc3U")' }}></div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-gray-900 dark:text-white text-sm font-medium leading-normal truncate">{user?.email?.split('@')[0] || "Guest"}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal truncate">{user?.email || "guest@toonify.com"}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                            onClick={logout}
                        >
                            <LogOut size={18} />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-white dark:bg-background-dark">
                {children}
            </main>
        </div>
    );
}
