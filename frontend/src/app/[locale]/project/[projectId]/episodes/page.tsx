'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProjectLayout from '@/components/layout/ProjectLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Filter,
    Plus,
    Clapperboard,
    Calendar,
    Film,
    MoreVertical,
    AlertCircle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import GenerateEpisodeModal from '@/components/project/modals/GenerateEpisodeModal';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// Types
interface Episode {
    id: string;
    title: string;
    episode_order?: number;
    thumbnail_url?: string;
    created_at?: string;
    status?: string; // e.g., 'draft', 'ready', etc. - assuming backfill or future support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface Project {
    id: string;
    title: string;
}

export default function EpisodesPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId as string;
    const t = useTranslations('Project.Episodes');

    const [project, setProject] = useState<Project | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'DRAFT'>('ALL');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) return;
            try {
                const [projRes, epRes] = await Promise.all([
                    api.get(`/projects/${projectId}`),
                    api.get(`/episodes/?project_id=${projectId}`)
                ]);
                setProject(projRes.data);
                setEpisodes(epRes.data);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    const handleEpisodeAdd = (newEpisode: any) => {
        setEpisodes([...episodes, newEpisode]);
        // Optional: Redirect immediately or just show in list
        // router.push(`/project/${projectId}/editor?episode_id=${newEpisode.id}`);
    };

    const filteredEpisodes = episodes.filter(ep => {
        const matchesSearch = ep.title.toLowerCase().includes(searchQuery.toLowerCase());
        const isReady = !!ep.thumbnail_url; // Simple logic for now: thumbnail = ready
        const matchesFilter =
            statusFilter === 'ALL' ? true :
                statusFilter === 'READY' ? isReady :
                    !isReady; // DRAFT

        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <ProjectLayout projectId={projectId} projectTitle="Loading...">
                <div className="flex h-full items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            </ProjectLayout>
        );
    }

    return (
        <ProjectLayout projectId={projectId} projectTitle={project?.title}>
            <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 h-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">{t('title')}</h1>
                        <p className="text-gray-400">{t('subtitle')}</p>
                    </div>
                    <Button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/20"
                    >
                        <Plus size={18} className="mr-2" />
                        {t('newEpisode')}
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[#0F0F12] border border-gray-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            className="pl-10 bg-[#15151A] border-gray-700 text-white focus:ring-purple-500/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="border-gray-700 bg-[#15151A] text-gray-300 hover:text-white hover:bg-[#1E1E24] min-w-[140px] justify-between">
                                    <span className="flex items-center gap-2">
                                        <Filter size={16} />
                                        {statusFilter === 'ALL' ? t('allStatus') : statusFilter === 'READY' ? t('ready') : t('draft')}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#18181B] border-gray-800 text-gray-300">
                                <DropdownMenuItem onClick={() => setStatusFilter('ALL')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    {t('allStatus')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('READY')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    {t('ready')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('DRAFT')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    {t('draft')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1">
                    {filteredEpisodes.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center gap-4 border-2 border-dashed border-gray-800 rounded-2xl bg-[#0F0F12]/50">
                            <div className="p-4 rounded-full bg-gray-800/50 text-gray-600">
                                <Clapperboard size={32} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-gray-300">{t('noEpisodes')}</h3>
                                <p className="text-sm text-gray-500">{t('noEpisodesDesc')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredEpisodes.map((ep) => (
                                <div
                                    key={ep.id}
                                    onClick={() => router.push(`/project/${projectId}/editor?episode_id=${ep.id}`)}
                                    className="group flex items-center justify-between p-4 bg-[#0f0f16] border border-slate-800 rounded-xl hover:border-slate-600 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail or Number */}
                                        {ep.thumbnail_url ? (
                                            <div className="w-16 h-16 rounded-lg bg-black/40 overflow-hidden relative shrink-0 border border-slate-700">
                                                <img src={ep.thumbnail_url} className="w-full h-full object-cover" alt={ep.title} />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-slate-600 font-mono font-bold text-lg border border-slate-800 shrink-0">
                                                {String(ep.episode_order || 0).padStart(2, '0')}
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="text-white font-bold text-sm mb-1 group-hover:text-purple-400 transition-colors">{ep.title}</h4>
                                            <div className="flex gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {ep.created_at ? new Date(ep.created_at).toLocaleDateString() : 'Draft'}</span>
                                                <span className="flex items-center gap-1"><Film size={12} /> Episode {ep.episode_order || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "text-[10px] px-2 py-1 rounded-full border",
                                            ep.thumbnail_url
                                                ? "bg-green-900/20 text-green-400 border-green-500/30"
                                                : "bg-slate-800 text-slate-400 border-slate-700"
                                        )}>
                                            {ep.thumbnail_url ? t('ready') : t('draft')}
                                        </span>
                                        <button className="p-2 text-slate-500 hover:text-white transition-colors">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <GenerateEpisodeModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                projectId={projectId}
                onGenerate={handleEpisodeAdd}
                nextOrder={episodes.length + 1}
            />
        </ProjectLayout>
    );
}
