'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Edit, Play } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    style_preset: string;
    created_at: string;
    thumbnail_url?: string;
}

export default function ProjectCard({ project }: { project: Project }) {
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all group">
            <div className="h-40 bg-gray-700 relative">
                {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl font-bold opacity-30">
                        {project.title.charAt(0)}
                    </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/project/${project.id}/editor`}>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <Edit size={16} className="mr-1" /> Edit
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-lg text-white truncate">{project.title}</h3>
                <p className="text-sm text-gray-400 mt-1 capitalize">{project.style_preset.replace('_', ' ')}</p>
                <p className="text-xs text-gray-500 mt-3">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    );
}
