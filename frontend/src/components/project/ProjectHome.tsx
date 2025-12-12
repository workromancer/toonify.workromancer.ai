'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectRightSidebar from './ProjectRightSidebar';
import CharacterCard, { Character } from './CharacterCard';
import AddCharacterCard from './AddCharacterCard';
import EditProjectModal from './modals/EditProjectModal';
import AddCharacterModal from './modals/AddCharacterModal';
import GenerateEpisodeModal from './modals/GenerateEpisodeModal';
import ArtStyleSetupModal from './modals/ArtStyleSetupModal';
import { Plus, X, Sparkles, Image as ImageIcon, RotateCw, Save, Wand2, Clapperboard, Edit2, Palette } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    description?: string;
    style_preset: string;
    thumbnail_url?: string;
    subtitle?: string;
    genre?: string;
    worldview?: string | any;
}

interface ProjectHomeProps {
    project: Project;
    characters: Character[];
    episodes: any[];
    onProjectUpdate: (p: Project) => void;
    onCharacterAdd: (c: Character) => void;
    onEpisodeAdd: (e: any) => void;
}

export default function ProjectHome({ project, characters, episodes, onProjectUpdate, onCharacterAdd, onEpisodeAdd }: ProjectHomeProps) {
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [isAddCharacterOpen, setIsAddCharacterOpen] = useState(false);
    const [isGenerateEpisodeOpen, setIsGenerateEpisodeOpen] = useState(false);
    const [isArtStyleSetupOpen, setIsArtStyleSetupOpen] = useState(false);
    const [isPollingCover, setIsPollingCover] = useState(false);

    // Poll for cover image if style is set but no thumbnail
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const checkCoverStatus = async () => {
            if (project.thumbnail_url) return; // Already has thumbnail

            // Assume 'anime_webtoon' is default/unset for this logic, or just check if user initiated
            // Ideally we check if a job is running, but for MVP we infer from state
            if (!project.style_preset || project.style_preset === 'anime_webtoon') return;

            setIsPollingCover(true);
            try {
                const res = await api.get(`/projects/${project.id}`);
                if (res.data.thumbnail_url) {
                    onProjectUpdate(res.data);
                    setIsPollingCover(false);
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
            setIsArtStyleSetupOpen(true);
            // Remove query param without refreshing
            const params = new URLSearchParams(searchParams);
            params.delete('setup');
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [searchParams, router, pathname]);

    return (
        <DashboardLayout>
            <div className="flex h-full items-start relative overflow-hidden">
                {/* Ambient Background for Project Home */}
                <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen z-0" />

                <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 relative z-10">
                    {/* Page Header matching Dashboard */}
                    <div className="flex flex-col gap-6 mb-8">
                        {/* Breadcrumb / Top Line */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                                    My Projects
                                </Link>
                                <span>/</span>
                                <span className="text-gray-900 dark:text-white font-medium">{project.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="h-9 px-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    <Save size={18} className="mr-2" />
                                    <span>Save</span>
                                </Button>
                                <Button
                                    className="h-10 px-4 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-sm shadow-sm transition-colors"
                                    onClick={() => setIsGenerateEpisodeOpen(true)}
                                >
                                    <Clapperboard size={18} className="mr-2" />
                                    <span>Generate Episode</span>
                                </Button>
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                                        {project.title}
                                    </h1>
                                    {project.subtitle && (
                                        <p className="text-xl text-gray-500 mt-1">{project.subtitle}</p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditProjectOpen(true)}
                                    className="gap-2"
                                >
                                    <Edit2 size={16} /> Edit Details
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {/* Worldview Display Logic */}
                                {typeof project.worldview === 'string' ? (
                                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal max-w-3xl whitespace-pre-line">
                                        {project.worldview || "No description provided."}
                                    </p>
                                ) : project.worldview ? (
                                    <div className="flex flex-col gap-3">
                                        {/* Structured Worldview from AI */}
                                        <div className="flex items-center gap-2">
                                            {project.worldview.tone && (
                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                                    {project.worldview.tone}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                            {project.worldview.title}
                                        </h3>

                                        <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-relaxed max-w-3xl">
                                            {project.worldview.content}
                                        </p>

                                        {project.worldview.key_features && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {project.worldview.key_features.map((feat: string, idx: number) => (
                                                    <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded">
                                                        #{feat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No worldview description provided.</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                {!project.style_preset || project.style_preset === 'anime_webtoon' ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsArtStyleSetupOpen(true)}
                                        className="h-7 text-xs border-dashed border-primary text-primary hover:bg-primary/5"
                                    >
                                        <Palette size={12} className="mr-1" /> Setup Art Style
                                    </Button>
                                ) : (
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 group/style cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => setIsArtStyleSetupOpen(true)}>
                                        Style: {project.style_preset}
                                        <Palette size={12} className="opacity-0 group-hover/style:opacity-100 transition-opacity" />
                                    </span>
                                )}

                                {project.style_preset && project.style_preset !== 'anime_webtoon' && characters.length === 0 && (
                                    <Link href={`/project/${project.id}/casting`}>
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
                                        >
                                            <Sparkles size={12} className="mr-1" /> Start Casting
                                        </Button>
                                    </Link>
                                )}

                                {project.genre && (
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {project.genre}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="flex flex-col gap-8">
                        {/* Project Thumbnail / Overview */}
                        <div className="relative w-full aspect-[21/9] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                            {project.thumbnail_url ? (
                                <div className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105" style={{ backgroundImage: `url("${project.thumbnail_url}")` }} />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/50">
                                    {isPollingCover ? (
                                        <div className="flex flex-col items-center gap-3 animate-pulse">
                                            <Palette className="w-12 h-12 text-primary/50" />
                                            <span className="text-sm font-medium text-gray-500">Generating AI Cover...</span>
                                        </div>
                                    ) : (
                                        <span className="text-6xl font-black opacity-20">{project.title.charAt(0)}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Characters Section */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <Link href={`/project/${project.id}/characters`} className="hover:underline">
                                    <h2 className="text-gray-900 dark:text-white text-2xl font-bold">Characters</h2>
                                </Link>
                                <Link href={`/project/${project.id}/casting`} className="text-primary text-sm font-bold hover:underline">
                                    + Add Character
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                                <Link href={`/project/${project.id}/casting`} className="cursor-pointer h-full">
                                    <AddCharacterCard />
                                </Link>
                                {characters.map(char => (
                                    <CharacterCard key={char.id || char.name} character={char} />
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Sidebar - Sticky within the flex container */}
                <div className="hidden xl:block w-80 shrink-0 sticky top-0 h-[calc(100vh)] overflow-y-auto border-l border-white/10 bg-[#13111C]/80 backdrop-blur-xl p-4 z-20">
                    <ProjectRightSidebar projectId={project.id} episodes={episodes} />
                </div>
            </div>

            {/* Modals */}
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
            <AddCharacterModal
                isOpen={isAddCharacterOpen}
                onClose={() => setIsAddCharacterOpen(false)}
                projectId={project.id}
                onAdd={onCharacterAdd}
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
