'use client';

import { useState, useEffect } from 'react';
import ViewStyleModal from './modals/ViewStyleModal';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import ProjectLayout from '@/components/layout/ProjectLayout';
import EditProjectModal from './modals/EditProjectModal';
import GenerateEpisodeModal from './modals/GenerateEpisodeModal';
import ArtStyleSetupModal from './modals/ArtStyleSetupModal';
import CharacterDetailModal from './modals/CharacterDetailModal';
import { Plus, Sparkles, Clapperboard, Edit2, Palette, ArrowRight, Settings, Play, AlertCircle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SectionLabel } from '@/components/ui/section-label';
import ImageGeneratingPlaceholder from '@/components/ui/ImageGeneratingPlaceholder';

interface Character {
    id?: string;
    name: string;
    description?: string;
    profile_image_url?: string;
    default_mood?: string | string[];
    sheet_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface Project {
    id: string;
    title: string;
    description?: string;
    style_preset: string;
    thumbnail_url?: string;
    cover_image_status?: string | null;
    subtitle?: string;
    genre?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worldview?: any;
    art_style?: string;
    style_reference_url?: string;
}

interface Episode {
    id: string;
    title: string;
    episode_order?: number;
    thumbnail_url?: string;
    created_at?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface ProjectHomeProps {
    project: Project;
    characters: Character[];
    episodes: Episode[];
    onProjectUpdate: (p: Project) => void;
    onCharacterAdd: (c: Character) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEpisodeAdd: (e: any) => void;
    onRefreshCharacters?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export default function ProjectHome({ project, characters, episodes, onProjectUpdate, onCharacterAdd, onEpisodeAdd, onRefreshCharacters, ...props }: ProjectHomeProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
    const [isArtStyleOpen, setIsArtStyleOpen] = useState(false);
    const [isViewStyleOpen, setIsViewStyleOpen] = useState(false);
    const [isCharacterDetailOpen, setIsCharacterDetailOpen] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Polling for cover image status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (project.cover_image_status === 'processing') {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/projects/${project.id}`);
                    const updatedProject = res.data;

                    if (updatedProject.cover_image_status !== 'processing') {
                        onProjectUpdate(updatedProject);
                        clearInterval(interval);

                        if (updatedProject.cover_image_status === 'completed') {
                            toast({
                                title: "Cover Generated",
                                description: "Your project cover has been successfully created.",
                            });
                        } else if (updatedProject.cover_image_status === 'failed') {
                            toast({
                                title: "Generation Failed",
                                description: "Failed to generate project cover.",
                                variant: 'destructive'
                            });
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [project.cover_image_status, project.id, onProjectUpdate, toast]);

    const handleUpdateProject = (updatedProject: Project) => {
        onProjectUpdate(updatedProject);
        setIsEditModalOpen(false);
    };

    const handleGenerateCover = async () => {
        if (!project.genre || !project.worldview) {
            toast({
                title: "Missing Information",
                description: "Please set a genre and worldview first. Opening settings...",
                // variant: 'default', // Changed from destructive to friendly
            });
            setIsEditModalOpen(true);
            return;
        }

        try {
            // Optimistic update
            onProjectUpdate({ ...project, cover_image_status: 'processing' });

            await api.post(`/projects/${project.id}/cover`);

            toast({
                title: "Generation Started",
                description: "AI is creating your cover art...",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Request Failed",
                description: "Failed to start cover generation.",
                variant: 'destructive',
            });
            onProjectUpdate({ ...project, cover_image_status: 'failed' });
        }
    };

    const handleCharacterRetry = async (charId: string) => {
        try {
            await api.post(`/characters/${charId}/generate`);
            // Trigger refresh via prop if available
            if (onRefreshCharacters) onRefreshCharacters();
        } catch (e) {
            console.error(e);
            toast({
                title: "Retry Failed",
                description: "Failed to retry character generation.",
                variant: 'destructive',
            });
        }
    }

    const isCoverProcessing = project.cover_image_status === 'processing';

    // Poll for pending characters
    useEffect(() => {
        const hasPendingChars = characters.some(c => c.sheet_status === 'pending' || c.sheet_status === 'processing');
        let intervalId: NodeJS.Timeout;

        if (hasPendingChars && onRefreshCharacters) {
            intervalId = setInterval(onRefreshCharacters, 3000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [characters, onRefreshCharacters]);

    // Update selected character when list updates (polling)
    useEffect(() => {
        if (selectedCharacter && isCharacterDetailOpen) {
            const upToDateChar = characters.find(c => c.id === selectedCharacter.id || c.name === selectedCharacter.name);
            if (upToDateChar) {
                setSelectedCharacter(upToDateChar);
            }
        }
    }, [characters, selectedCharacter, isCharacterDetailOpen]);

    const handleCharacterClick = (char: Character) => {
        setSelectedCharacter(char);
        setIsCharacterDetailOpen(true);
    };

    // Check for setup query param
    useEffect(() => {
        if (searchParams && searchParams.get('setup') === 'true') {
            const timer = setTimeout(() => {
                setIsArtStyleOpen(true);
                const params = new URLSearchParams(searchParams);
                params.delete('setup');
                router.replace(`${pathname}?${params.toString()}`);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [searchParams, router, pathname]);

    const handleStyleClick = () => {
        if (project.style_preset && project.style_preset !== 'anime_webtoon') {
            setIsViewStyleOpen(true);
        } else {
            setIsArtStyleOpen(true);
        }
    };

    return (
        <ProjectLayout projectId={project.id} projectTitle={project.title}>
            <div className="flex h-full relative overflow-y-auto bg-[#0A0A0B]">
                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Hero Section */}
                    <div className="relative w-full aspect-[21/9] max-h-[400px] bg-black group overflow-hidden">
                        <div
                            className={cn(
                                "absolute inset-0 bg-cover bg-center transition-all duration-700",
                                isCoverProcessing && "opacity-50 filter blur-sm"
                            )}
                            style={{
                                backgroundImage: project.thumbnail_url ? `url("${project.thumbnail_url}")` : undefined,
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/60 to-transparent" />

                        {/* Status Overlay for Processing */}
                        {isCoverProcessing && (
                            <ImageGeneratingPlaceholder text="GENERATING COVER ART..." />
                        )}

                        <div className="absolute bottom-0 left-0 w-full p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 z-10">
                            <div className="flex flex-col gap-4 max-w-2xl">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-white border border-white/20">
                                        {project.genre || "Genre Not Set"}
                                    </span>
                                    {project.worldview?.tone && Array.isArray(project.worldview.tone) && project.worldview.tone.map((t: string) => (
                                        <span key={t} className="px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md text-xs font-bold text-purple-200 border border-purple-500/30">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                                    {project.title}
                                </h1>
                                <p className="text-lg text-gray-300 font-medium line-clamp-2 max-w-xl">
                                    {project.description || project.worldview?.content || project.worldview?.description || "No description yet."}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    size="lg"
                                    onClick={handleGenerateCover}
                                    disabled={isCoverProcessing}
                                    className={cn(
                                        "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1",
                                        isCoverProcessing && "cursor-not-allowed opacity-70"
                                    )}
                                >
                                    <Sparkles className={cn("mr-2 h-4 w-4", isCoverProcessing && "animate-spin")} />
                                    {isCoverProcessing ? "Generating..." : "Generate AI Cover"}
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="bg-white text-black hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Project Settings
                                </Button>
                            </div>
                        </div>

                        {/* Quick Actions / Stats Overlay */}
                        <div className="absolute top-8 right-8 flex flex-col items-end gap-3 z-20">
                            <div className="flex items-center gap-2 p-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                                    title="Art Style"
                                    onClick={handleStyleClick}
                                >
                                    <Palette size={16} />
                                </Button>
                            </div>
                            {/* Sync Status */}
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono text-gray-300 backdrop-blur-sm">
                                <Database size={10} className="text-[#4a4aff]" /> Synced
                            </span>
                        </div>
                    </div>

                    {/* Content Section (Episodes & Characters) */}
                    <div className="flex-1 p-6 md:p-8 bg-[#0A0A0B]">
                        <div className="max-w-7xl mx-auto flex flex-col gap-12">

                            {/* Worldview Key Features */}
                            {project.worldview?.key_features && Array.isArray(project.worldview.key_features) && (
                                <section className="mb-4">
                                    <SectionLabel icon={<Sparkles size={12} />} className="mb-3 text-gray-400">Key Features</SectionLabel>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {project.worldview.key_features.map((feature: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#0F0F12] border border-gray-800">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                                <span className="text-sm text-gray-300 leading-relaxed">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Episodes List */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-white">Episodes</h3>
                                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-gray-400 font-mono">{episodes?.length || 0}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            className="h-9 px-4 rounded-full bg-[#4a4aff] hover:bg-[#3d3dcc] text-white font-bold shadow-lg shadow-blue-900/20 text-xs"
                                            onClick={() => setIsEpisodeModalOpen(true)}
                                        >
                                            <Sparkles size={14} className="mr-2" /> New Episode
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {episodes && episodes.length > 0 ? (
                                        episodes.map((ep, idx) => (
                                            <div key={ep.id} className="group relative flex items-center gap-4 p-3 pr-4 rounded-xl bg-[#0F0F12] border border-gray-800 hover:border-gray-700 transition-all hover:bg-[#15151A]">
                                                {/* Episode Thumbnail */}
                                                <div className="w-32 aspect-video rounded-md bg-black/40 overflow-hidden relative shrink-0 border border-white/5">
                                                    {ep.thumbnail_url ? (
                                                        <img src={ep.thumbnail_url} className="w-full h-full object-cover" alt={ep.title} />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                                                            <span className="text-xl font-bold">{ep.episode_order}</span>
                                                        </div>
                                                    )}
                                                    {idx === episodes.length - 1 && (
                                                        <div className="absolute top-1 left-1 w-2 h-2 bg-[#4a4aff] rounded-full shadow-[0_0_8px_rgba(74,74,255,0.8)]" />
                                                    )}
                                                </div>

                                                {/* Episode Info */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-gray-500 uppercase">EP {ep.episode_order}</span>
                                                        <span className="text-[10px] text-gray-600">•</span>
                                                        <span className="text-[10px] text-gray-500">{ep.created_at ? new Date(ep.created_at).toLocaleDateString() : 'Draft'}</span>
                                                    </div>
                                                    <h4 className="text-base font-bold text-gray-200 group-hover:text-white truncate pr-4">
                                                        {ep.title}
                                                    </h4>
                                                </div>

                                                {/* Studio Actions */}
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                                                        <Play size={14} />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                                                        <Edit2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                                            <div className="p-3 rounded-full bg-white/5 text-gray-500">
                                                <Clapperboard size={24} />
                                            </div>
                                            <p className="text-sm text-gray-500">No episodes created yet.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Characters Section */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        Cast & Characters
                                    </h3>
                                    <Link href={`/project/${project.id}/characters`}>
                                        <Button variant="ghost" size="sm" className="text-sm text-gray-400 hover:text-white">View All <ArrowRight size={14} className="ml-1" /></Button>
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    <div
                                        onClick={() => router.push(`/project/${project.id}/casting`)}
                                        className="aspect-[3/4] cursor-pointer rounded-xl border border-dashed border-gray-800 bg-[#0F0F12] flex flex-col items-center justify-center gap-2 hover:bg-[#15151A] hover:border-gray-700 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                            <Plus size={16} />
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 group-hover:text-gray-300">Add Character</span>
                                    </div>


                                    {[...characters].reverse().slice(0, 5).map(char => {
                                        const isGenerating = char.sheet_status === 'pending' || char.sheet_status === 'processing';
                                        const isFailed = char.sheet_status === 'failed';
                                        return (
                                            <div
                                                key={char.id || char.name}
                                                onClick={() => handleCharacterClick(char)}
                                                className={cn(
                                                    "group relative rounded-xl overflow-hidden bg-[#0F0F12] border transition-all cursor-pointer",
                                                    isFailed
                                                        ? "border-red-500/50 hover:border-red-500"
                                                        : "border-gray-800 hover:border-gray-700"
                                                )}
                                            >
                                                <div className="aspect-[3/4] bg-cover bg-center relative" style={char.profile_image_url && !isGenerating ? { backgroundImage: `url("${char.profile_image_url}")` } : {}}>
                                                    {isGenerating && (
                                                        <ImageGeneratingPlaceholder text="CREATING..." />
                                                    )}

                                                    {(!char.profile_image_url && !isGenerating && !isFailed) && (
                                                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-gray-600 gap-2">
                                                            <span className="font-bold text-xl">{char.name[0]}</span>
                                                        </div>
                                                    )}

                                                    {isFailed && (
                                                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-gray-600 gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                                                                <AlertCircle size={16} />
                                                            </div>
                                                            <span className="text-[10px] text-red-400 font-bold">FAILED</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                                    <h4 className="text-white text-xs font-bold truncate">{char.name}</h4>
                                                    <p className="text-[10px] text-gray-400 truncate">{Array.isArray(char.default_mood) ? char.default_mood.join(', ') : (char.default_mood || 'Neutral')}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ViewStyleModal
                isOpen={isViewStyleOpen}
                onClose={() => setIsViewStyleOpen(false)}
                styleName={project.style_preset}
                styleImageUrl={project.style_reference_url}
                description={project.art_style}
            />
            <EditProjectModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                project={project}
                onUpdate={handleUpdateProject}
            />
            <GenerateEpisodeModal
                isOpen={isEpisodeModalOpen}
                onClose={() => setIsEpisodeModalOpen(false)}
                projectId={project.id}
                onGenerate={onEpisodeAdd}
                nextOrder={episodes ? episodes.length + 1 : 1}
            />
            <ArtStyleSetupModal
                isOpen={isArtStyleOpen}
                onClose={() => setIsArtStyleOpen(false)}
                projectId={project.id}
                currentStyle={project.style_preset}
                onStyleUpdate={(newStyle: string) => onProjectUpdate({ ...project, style_preset: newStyle })}
                projectTitle={project.title}
                projectGenre={project.genre}
            />
            <CharacterDetailModal
                isOpen={isCharacterDetailOpen}
                onClose={() => setIsCharacterDetailOpen(false)}
                character={selectedCharacter}
                onRetry={handleCharacterRetry}
            />
        </ProjectLayout>
    );
}
