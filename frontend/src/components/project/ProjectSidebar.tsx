'use client';

import Link from 'next/link';
import { LayoutGrid, LayoutDashboard, Image as ImageIcon, Settings, HelpCircle, ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const NavSection = ({ title, icon: Icon, links, defaultOpen = false }: { title: string, icon: LucideIcon, links: { href: string, text: string, isActive?: boolean }[], defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <CollapsibleTrigger className={cn(
                "flex w-full items-center justify-between rounded-lg p-3 text-left text-sm font-medium transition-colors",
                isOpen ? "bg-primary/10 text-primary" : "text-gray-600 dark:text-[#a19db9] hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white"
            )}>
                <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span>{title}</span>
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-2 flex flex-col gap-1 pl-4">
                    {links.map((link, index) => (
                        <Link
                            key={index}
                            href={link.href}
                            className={cn(
                                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                link.isActive
                                    ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-[#a19db9] hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white"
                            )}
                        >
                            {link.text}
                        </Link>
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default function ProjectSidebar({ projectName }: { projectName: string }) {
    const projectLinks = [
        { href: "#", text: projectName, isActive: true },
        // { href: "#", text: "The Silent City" },
        // { href: "#", text: "My First Webtoon" },
    ];
    const templateLinks = [
        { href: "#", text: "Sci-Fi Saga" },
        { href: "#", text: "Fantasy Romance" },
        { href: "#", text: "Slice of Life" },
    ];
    const assetLinks = [
        { href: "#", text: "Characters" },
        { href: "#", text: "Backgrounds" },
        { href: "#", text: "Props" },
    ];

    return (
        <aside className="sticky top-[80px] z-10 hidden h-[calc(100vh-80px)] w-64 flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-solid border-gray-200 dark:border-white/10 bg-background-light/80 p-4 backdrop-blur-sm dark:bg-background-dark/80 lg:flex">
            <nav className="flex flex-col gap-2">
                <NavSection title="My Projects" icon={LayoutGrid} links={projectLinks} defaultOpen={true} />
                <NavSection title="Templates" icon={LayoutDashboard} links={templateLinks} />
                <NavSection title="Assets" icon={ImageIcon} links={assetLinks} />
            </nav>
            <div className="mt-auto flex flex-col gap-2">
                <Link href="#" className="flex items-center gap-3 rounded-lg p-3 text-left text-sm font-medium text-gray-600 dark:text-[#a19db9] hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white">
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 rounded-lg p-3 text-left text-sm font-medium text-gray-600 dark:text-[#a19db9] hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white">
                    <HelpCircle size={20} />
                    <span>Help & Support</span>
                </Link>
            </div>
        </aside>
    );
}
