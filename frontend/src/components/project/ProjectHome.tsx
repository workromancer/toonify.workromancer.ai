

'use client';

import { useState, useEffect } from 'react';
import ViewStyleModal from './modals/ViewStyleModal';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EditProjectModal from './modals/EditProjectModal';
import GenerateEpisodeModal from './modals/GenerateEpisodeModal';
import ArtStyleSetupModal from './modals/ArtStyleSetupModal';
import { Plus, Sparkles, Clapperboard, Edit2, Palette, ArrowLeft, Play, ArrowRight, Settings, FolderOpen, Upload, Database, Zap, Code } from 'lucide-react';

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
    subtitle?: string;
    genre?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worldview?: any;
    art_style?: string; // Should be consistent with interface
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
}

export default function ProjectHome({ project, characters, episodes, onProjectUpdate, onCharacterAdd, onEpisodeAdd, onRefreshCharacters }: ProjectHomeProps) {
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [isGenerateEpisodeOpen, setIsGenerateEpisodeOpen] = useState(false);
    const [isArtStyleSetupOpen, setIsArtStyleSetupOpen] = useState(false);
    const [isViewStyleOpen, setIsViewStyleOpen] = useState(false);

    const handleStyleClick = () => {
        if (project.style_preset && project.style_preset !== 'anime_webtoon') {
            setIsViewStyleOpen(true);
        } else {
            setIsArtStyleSetupOpen(true);
        }
    };

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

    // Poll for cover image if style is set but no thumbnail
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const checkCoverStatus = async () => {
            if (project.thumbnail_url) return; // Already has thumbnail

            // Assume 'anime_webtoon' is default/unset for this logic, or just check if user initiated
            if (!project.style_preset || project.style_preset === 'anime_webtoon') return;

            try {
                const res = await api.get(`/projects/${project.id}`);
                if (res.data.thumbnail_url) {
                    onProjectUpdate(res.data);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        if (!project.thumbnail_url && project.style_preset && project.style_preset !== 'anime_webtoon') {
            checkCoverStatus(); // Check immediately
            intervalId = setInterval(checkCoverStatus, 5000); // Check every 5s
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [project.id, project.thumbnail_url, project.style_preset, onProjectUpdate]);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Check for setup query param
    useEffect(() => {
        if (searchParams && searchParams.get('setup') === 'true') {
            // Use setTimeout to avoid synchronous state update warning during render phase
            const timer = setTimeout(() => {
                setIsArtStyleSetupOpen(true);
                // Remove query param without refreshing
                const params = new URLSearchParams(searchParams);
                params.delete('setup');
                router.replace(`${pathname}?${params.toString()}`);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [searchParams, router, pathname]);

    return (
        <DashboardLayout>
            <ViewStyleModal
                isOpen={isViewStyleOpen}
                onClose={() => setIsViewStyleOpen(false)}
                styleName={project.style_preset}
                styleImageUrl={project.style_reference_url}
                description={project.art_style}
            />
            <div className="flex h-full relative overflow-y-auto bg-[#13111C]">
                {/* Main Content Scrollable Area */}
                <div className="flex-1 flex flex-col min-h-0 relative z-10 custom-scrollbar">
                    
                    {/* Immersive Hero Banner */}
                    <div className="relative w-full h-[400px] shrink-0 group border-b border-white/5">
                        {/* Background Image */}
                        <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ 
                                backgroundImage: `url("${project.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2564&ixlib=rb-4.0.3'}")` 
                            }}
                        />
                        {/* Gradient Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#13111C] via-[#13111C]/40 to-[#13111C]/20" />
                        <div className="absolute inset-0 bg-black/20" />

                        {/* Generate AI Cover Button (if missing) */}
                        {!project.thumbnail_url && (
                             <div className="absolute inset-0 flex items-center justify-center z-30">
                                <Button 
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold py-6 px-8 rounded-xl shadow-2xl transition-all hover:scale-105 group/gen"
                                    onClick={async () => {
                                        try {
                                             await api.post(`/projects/${project.id}/cover`);
                                             // Ideally show a toast here
                                             alert("Cover generation started! It will appear shortly.");
                                        } catch (e) {
                                            console.error("Failed to start generation", e);
                                            alert("Failed to start generation.");
                                        }
                                    }}
                                >
                                    <Sparkles className="w-6 h-6 mr-3 text-purple-400 group-hover/gen:text-purple-300 group-hover/gen:animate-pulse" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-lg">Generate AI Cover</span>
                                        <span className="text-xs text-gray-300 font-normal">Create a unique style & cover art</span>
                                    </div>
                                </Button>
                            </div>
                        )}

                        {/* Top Navigation (Floating) */}
                        <div className="absolute top-6 left-6 z-20">
                            <Link href="/dashboard">
                                <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-black/40 gap-2 h-9 px-3 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-all">
                                    <ArrowLeft size={14} />
                                    <span className="text-sm font-medium">My Projects</span>
                                </Button>
                            </Link>
                        </div>

                        {/* Banner Content (Bottom Left) */}
                        <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex flex-col gap-4 max-w-4xl">
                                {/* Tags / Badges / Worldview Data */}
                                {/* Tags / Badges / Worldview Data */}
                                <div className="flex items-center flex-wrap gap-2">
                                    {project.genre && (
                                        <span className="px-2.5 py-0.5 rounded-md bg-[#4a4aff] text-white text-[10px] font-bold uppercase tracking-wider shadow-lg border border-[#6b6bff]">
                                            {project.genre}
                                        </span>
                                    )}
                                    {/* Render Tones */}
                                    {project.worldview?.tone && Array.isArray(project.worldview.tone) && project.worldview.tone.map((t: string) => (
                                         <span key={t} className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 text-[10px] font-bold uppercase tracking-wider border border-purple-500/30">
                                            {t}
                                        </span>
                                    ))}
                                    
                                    <div className="relative group/style cursor-pointer" onClick={handleStyleClick}>
                                        <span className="px-2.5 py-0.5 rounded-md bg-black/40 hover:bg-black/60 text-white text-[10px] font-medium border border-white/10 backdrop-blur-md flex items-center gap-1.5 transition-all">
                                            <Palette size={10} className="text-[#a9a9d1]" /> 
                                            {project.style_preset || "Setup Style"}
                                        </span>
                                    </div>
                                    <div className="w-px h-3 bg-white/20 mx-1" />
                                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-gray-300">
                                        <Database size={10} className="text-[#4a4aff]" /> Synced
                                    </span>
                                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-gray-300">
                                        <Zap size={10} className="text-yellow-400" /> Fast Prod.
                                    </span>
                                </div>

                                {/* Title & Meta */}
                                <div>
                                    <div className="flex items-baseline gap-4 mb-1">
                                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-[-0.02em] drop-shadow-xl">
                                            {project.title}
                                        </h1>
                                        {/* Status Badge */}
                                        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current shimmer"></div>
                                            Active
                                        </div>
                                    </div>
                                    <p className="text-gray-300/80 text-sm md:text-base max-w-2xl line-clamp-3">
                                        {project.subtitle || project.description || project.worldview?.content || project.worldview?.description || "No description provided."}
                                    </p>
                                </div>
                            </div>

                            {/* Creator Actions Toolbar */}
                            <div className="flex flex-col items-end gap-3 shrink-0">
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
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10" 
                                        title="Project Settings" 
                                        onClick={() => setIsEditProjectOpen(true)}
                                    >
                                        <Settings size={16} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10" title="Manage Assets" onClick={() => alert("Asset Manager: Coming Soon")}>
                                        <FolderOpen size={16} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10" title="Generator Options" onClick={() => alert("Generator Options: Coming Soon")}>
                                        <Code size={16} />
                                    </Button>
                                    <div className="w-px h-4 bg-white/10 mx-1" />
                                    <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10" title="Export Project" onClick={() => alert("Export started!")}>
                                        <Upload size={16} />
                                    </Button>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                     <Button 
                                        className="h-10 px-6 rounded-full bg-white text-black hover:bg-white/90 font-bold border border-transparent shadow-lg"
                                        onClick={() => setIsEditProjectOpen(true)}
                                    >
                                        <Edit2 size={16} className="mr-2" /> Edit Details
                                    </Button>
                                    <Button 
                                        className="h-10 px-6 rounded-full bg-[#4a4aff] hover:bg-[#3d3dcc] text-white font-bold shadow-lg shadow-blue-900/20"
                                        onClick={() => setIsGenerateEpisodeOpen(true)}
                                    >
                                        <Sparkles size={16} className="mr-2" /> New Episode
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section (Episodes & Characters) */}
                    <div className="flex-1 p-6 md:p-8 bg-[#13111C]">
                        <div className="max-w-7xl mx-auto flex flex-col gap-12">
                            
                            {/* Worldview Key Features (If available) */}
                            {project.worldview?.key_features && Array.isArray(project.worldview.key_features) && (
                                <section className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Sparkles size={12} /> Key Features
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {project.worldview.key_features.map((feature: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                                <span className="text-sm text-gray-300 leading-relaxed">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                            
                            {/* Episodes List - Studio Mode */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-white">Episodes</h3>
                                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-gray-400 font-mono">{episodes?.length || 0}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 text-xs">Ascending</Button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {episodes && episodes.length > 0 ? (
                                        episodes.map((ep, idx) => (
                                            <div key={ep.id} className="group relative flex items-center gap-4 p-3 pr-4 rounded-xl bg-[#1d1c27] border border-white/5 hover:border-white/10 transition-all hover:bg-[#252433]">
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
                                        // Empty State
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
                                    {/* Add Card */}
                                    <div 
                                        onClick={() => router.push(`/project/${project.id}/casting`)}
                                        className="aspect-[3/4] cursor-pointer rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-2 hover:bg-white/[0.05] hover:border-white/20 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                            <Plus size={16} />
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 group-hover:text-gray-300">Add Character</span>
                                    </div>
                                    
                                    {characters.slice(0, 5).map(char => {
                                        const isGenerating = char.sheet_status === 'pending' || char.sheet_status === 'processing';
                                        return (
                                            <div key={char.id || char.name} className="group relative rounded-xl overflow-hidden bg-[#1d1c27] border border-white/5 hover:border-white/20 transition-all">
                                                <div className="aspect-[3/4] bg-cover bg-center relative" style={char.profile_image_url && !isGenerating ? { backgroundImage: `url("${char.profile_image_url}")` } : {}}>
                                                    {(!char.profile_image_url || isGenerating) && (
                                                         <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-gray-600 gap-2">
                                                            {isGenerating ? (
                                                                <>
                                                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                                    <span className="text-[10px] text-primary font-mono animate-pulse">CREATING...</span>
                                                                </>
                                                            ) : (
                                                                <span className="font-bold text-xl">{char.name[0]}</span>
                                                            )}
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

            {/* Modals - Kept same */}
            <ArtStyleSetupModal
                isOpen={isArtStyleSetupOpen}
                onClose={() => setIsArtStyleSetupOpen(false)}
                projectId={project.id}
                currentStyle={project.style_preset}
                projectTitle={project.title}
                projectGenre={project.genre}
                onStyleUpdate={(newStyle: string) => onProjectUpdate({ ...project, style_preset: newStyle })}
            />
            <EditProjectModal
                isOpen={isEditProjectOpen}
                onClose={() => setIsEditProjectOpen(false)}
                project={project}
                onUpdate={onProjectUpdate}
            />

            <GenerateEpisodeModal
                isOpen={isGenerateEpisodeOpen}
                onClose={() => setIsGenerateEpisodeOpen(false)}
                projectId={project.id}
                onGenerate={onEpisodeAdd}
                nextOrder={episodes ? episodes.length + 1 : 1}
            />
        </DashboardLayout>
    );
}
