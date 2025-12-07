'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    style_preset: string;
    created_at: string;
    thumbnail_url?: string;
}

export default function ProjectCard({ project }: { project: Project }) {
    return (
        <div className="flex flex-col gap-3 group cursor-pointer">
            <Link href={`/project/${project.id}`} className="block">
                <div
                    className="w-full bg-center bg-no-repeat bg-cover rounded-xl aspect-[4/5] transition-transform group-hover:scale-[1.02] shadow-sm relative overflow-hidden bg-gray-200 dark:bg-gray-800"
                    style={{ backgroundImage: project.thumbnail_url ? `url("${project.thumbnail_url}")` : undefined }}
                >
                    {!project.thumbnail_url && (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl font-bold opacity-30">
                            {project.title.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-colors" />
                </div>
            </Link>
            <div>
                <Link href={`/project/${project.id}`}>
                    <p className="text-gray-900 dark:text-white text-base font-medium leading-normal group-hover:text-primary transition-colors truncate">
                        {project.title}
                    </p>
                </Link>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">
                        Last modified: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
