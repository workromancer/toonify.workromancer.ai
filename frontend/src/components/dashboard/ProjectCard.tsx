'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                    className="w-full bg-center bg-no-repeat bg-cover rounded-xl aspect-[4/5] transition-all duration-300 group-hover:scale-[1.02] shadow-sm group-hover:shadow-[0_0_20px_rgba(55,19,236,0.2)] relative overflow-hidden bg-[#0F0F12] border border-gray-800 group-hover:border-primary/50"
                    style={{ backgroundImage: project.thumbnail_url ? `url("${project.thumbnail_url}")` : undefined }}
                >
                    {!project.thumbnail_url && (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-500 text-4xl font-bold opacity-30 group-hover:opacity-50 transition-opacity">
                            {project.title.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            </Link>
            <div>
                <Link href={`/project/${project.id}`}>
                    <p className="text-white text-base font-bold leading-normal group-hover:text-primary transition-colors truncate">
                        {project.title}
                    </p>
                </Link>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-sm font-normal leading-normal">
                        Last modified: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
