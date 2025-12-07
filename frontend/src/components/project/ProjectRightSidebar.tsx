'use client';

import Link from 'next/link';
import { Settings, FolderOpen, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Episode {
    id: string;
    title: string;
}

interface ProjectRightSidebarProps {
    projectId: string;
    episodes: Episode[];
}

export default function ProjectRightSidebar({ projectId, episodes }: ProjectRightSidebarProps) {
    const [isEpisodesOpen, setIsEpisodesOpen] = useState(true);

    return (
        <aside className="sticky top-[80px] z-10 hidden h-[calc(100vh-80px)] w-64 flex-shrink-0 flex-col gap-6 overflow-y-auto border-l border-solid border-gray-200 dark:border-white/10 bg-background-light/80 p-4 backdrop-blur-sm dark:bg-background-dark/80 lg:flex">
            <div className="rounded-xl bg-white dark:bg-[#1d1c27] p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                    <button className="flex w-full items-center gap-3 rounded-lg bg-gray-100 dark:bg-white/10 p-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                        <Settings size={20} /> <span>Project Settings</span>
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-lg bg-gray-100 dark:bg-white/10 p-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                        <FolderOpen size={20} /> <span>Manage Assets</span>
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-lg bg-gray-100 dark:bg-white/10 p-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                        <Upload size={20} /> <span>Export Project</span>
                    </button>
                </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-[#1d1c27] p-4 shadow-sm">
                <Collapsible open={isEpisodesOpen} onOpenChange={setIsEpisodesOpen}>
                    <CollapsibleTrigger className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Episodes</h3>
                        {isEpisodesOpen ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-4 flex flex-col gap-2">
                            {episodes && episodes.length > 0 ? (
                                episodes.map((ep) => (
                                    <Link
                                        key={ep.id}
                                        href={`/project/${projectId}/editor?episodeId=${ep.id}`}
                                        className="block rounded-md p-2 text-sm text-gray-600 dark:text-[#a19db9] hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                                    >
                                        {ep.title}
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 p-2">No episodes yet.</p>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </aside>
    );
}
