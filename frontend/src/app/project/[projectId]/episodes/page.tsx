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
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Episodes</h1>
                        <p className="text-gray-400">Manage and organize your series episodes.</p>
                    </div>
                    <Button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/20"
                    >
                        <Plus size={18} className="mr-2" />
                        New Episode
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[#0F0F12] border border-gray-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <Input
                            placeholder="Search episodes..."
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
                                        {statusFilter === 'ALL' ? 'All Status' : statusFilter === 'READY' ? 'Ready' : 'Draft'}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#18181B] border-gray-800 text-gray-300">
                                <DropdownMenuItem onClick={() => setStatusFilter('ALL')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    All Status
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('READY')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Ready
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('DRAFT')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Draft
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
                                <h3 className="text-lg font-bold text-gray-300">No episodes found</h3>
                                <p className="text-sm text-gray-500">Try adjusting your search or filters, or create a new episode.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredEpisodes.map((ep) => (
                                <div
                                    key={ep.id}
                                    onClick={() => router.push(`/project/${projectId}/editor?episode_id=${ep.id}`)}
                                    className="group relative flex flex-col bg-[#0F0F12] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-black/40 relative overflow-hidden">
                                        {ep.thumbnail_url ? (
                                            <img
                                                src={ep.thumbnail_url}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                alt={ep.title}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[#15151A]">
                                                <span className="text-4xl font-mono font-bold text-gray-700 group-hover:text-gray-600 transition-colors">
                                                    {String(ep.episode_order || 0).padStart(2, '0')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Overlay Status */}
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border",
                                                ep.thumbnail_url
                                                    ? "bg-green-500/20 text-green-200 border-green-500/30"
                                                    : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                            )}>
                                                {ep.thumbnail_url ? 'Ready' : 'Draft'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 flex flex-col gap-2 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-gray-200 line-clamp-1 group-hover:text-purple-400 transition-colors">
                                                {ep.title}
                                            </h3>
                                        </div>

                                        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-800/50">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                {ep.created_at ? new Date(ep.created_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Film size={12} />
                                                Episode {ep.episode_order || 0}
                                            </span>
                                        </div>
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
