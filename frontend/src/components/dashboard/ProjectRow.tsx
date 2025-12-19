'use client';

import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { MoreVertical, Trash2, Clock, Calendar } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from './ProjectCard';

interface ProjectRowProps {
    project: Project;
    onDelete: (p: Project) => void;
}

export default function ProjectRow({ project, onDelete }: ProjectRowProps) {
    const router = useRouter();
    const t = useTranslations('Dashboard');

    return (
        <div
            onClick={() => router.push(`/project/${project.id}`)}
            className="group flex items-center justify-between p-4 bg-[#0f0f16] border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-[#13131c] transition-all duration-200 cursor-pointer"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-slate-900 overflow-hidden shrink-0 relative border border-slate-800">
                    {project.thumbnail_url ? (
                        <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 font-bold">
                            {project.title.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col min-w-0">
                    <h3 className="text-white font-bold truncate text-sm mb-1 group-hover:text-purple-400 transition-colors">
                        {project.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(project.created_at).toLocaleDateString()}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400">
                            {project.style_preset || t('defaultPreset')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pl-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                        >
                            <MoreVertical size={16} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#15151A] border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(project);
                            }}
                            className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                        >
                            <Trash2 size={16} className="mr-2" />
                            {t('deleteProject')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
