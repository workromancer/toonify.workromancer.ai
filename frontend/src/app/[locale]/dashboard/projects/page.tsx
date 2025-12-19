'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from '@/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { LayoutGrid, List, Search, FolderOpen } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import ProjectCard, { Project } from '@/components/dashboard/ProjectCard';
import ProjectRow from '@/components/dashboard/ProjectRow';
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function ProjectsPage() {
    const t = useTranslations('Dashboard');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const { user } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects', { timeout: 5000 });
            setProjects(res.data);
        } catch (err) {
            console.error(err);
            toast({
                title: t('errors.loadFailed') || "Failed to load projects",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            await api.delete(`/projects/${projectToDelete.id}`);
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            toast({ title: t('deleteSuccess') || "Project deleted" });
        } catch (error) {
            console.error(error);
            toast({ title: t('deleteFailed') || "Failed to delete project", variant: "destructive" });
        } finally {
            setIsDeleteDialogOpen(false);
            setProjectToDelete(null);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 min-h-screen bg-[#05050a] text-slate-200 font-sans relative selection:bg-purple-500/30 p-10 max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{t('nav.projects')}</h1>
                    <p className="text-slate-400 text-sm">Manage and organize your webtoon projects.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900 border border-slate-700/50 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:border-purple-500 outline-none w-64 transition-all placeholder:text-slate-600 focus:w-80 focus:bg-slate-900/80"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {loading ? (
                    <div className="w-full h-40 flex items-center justify-center text-slate-600">
                        <span className="animate-pulse">{t('loadingProjects')}</span>
                    </div>
                ) : filteredProjects.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                            {filteredProjects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onDelete={(p) => {
                                        setProjectToDelete(p);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredProjects.map(project => (
                                <ProjectRow
                                    key={project.id}
                                    project={project}
                                    onDelete={(p) => {
                                        setProjectToDelete(p);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    <div className="w-full h-60 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 bg-slate-900/20">
                        <FolderOpen size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium text-slate-400">{t('noProjects')}</p>
                        <p className="text-sm mt-1">Create a new project to get started.</p>
                    </div>
                )}
            </div>

            <ConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title={t('deleteProjectTitle') || "Delete Project"}
                description={t('deleteProjectDesc') || "This action will soft delete the project. Please type the project name to confirm."}
                confirmLabel={t('delete') || "Delete"}
                variant="destructive"
                onConfirm={handleDeleteProject}
                verificationText={projectToDelete?.title}
            />

            <style jsx global>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
