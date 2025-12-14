
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProjectLayout from '@/components/layout/ProjectLayout';
import CharacterDetailModal from '@/components/project/modals/CharacterDetailModal';
import { Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    default_mood: string | string[];
    profile_image_url?: string;
    sheet_status?: 'pending' | 'processing' | 'completed' | 'failed';
    description?: string;
}

interface Project {
    id: string;
    title: string;
    style_preset?: string;
}

export default function CharacterListPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId as string;
    const [characters, setCharacters] = useState<Character[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Modal State
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) return;
            try {
                // Parallel fetch
                const [projRes, charRes] = await Promise.all([
                    api.get(`/projects/${projectId}`),
                    api.get(`/characters/?project_id=${projectId}`)
                ]);
                setProject(projRes.data);
                setCharacters(charRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    // Poll for updates if there are pending characters
    useEffect(() => {
        const hasPending = characters.some(c => c.sheet_status === 'pending' || c.sheet_status === 'processing');
        let interval: NodeJS.Timeout;

        if (hasPending && projectId) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/characters/?project_id=${projectId}`);
                    // Only update if changed to avoid unnecessary re-renders, or just simple set
                    setCharacters(res.data);

                    // Also update selected character if it's open
                    if (selectedCharacter && isDetailOpen) {
                        const updatedSelected = res.data.find((c: Character) => c.id === selectedCharacter.id);
                        if (updatedSelected) {
                            setSelectedCharacter(updatedSelected);
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
    }, [characters, projectId, isDetailOpen, selectedCharacter]);

    const handleRetryCharacter = async (charId: string) => {
        try {
            await api.post(`/characters/${charId}/generate`);
            // Optimistic update
            setCharacters(prev => prev.map(c =>
                c.id === charId ? { ...c, sheet_status: 'processing', profile_image_url: undefined } : c
            ));

            if (selectedCharacter && selectedCharacter.id === charId) {
                setSelectedCharacter({ ...selectedCharacter, sheet_status: 'processing' });
            }
        } catch (e) {
            console.error("Retry failed", e);
            toast({
                title: "Retry Failed",
                description: "Failed to retry character generation.",
                variant: 'destructive',
            });
        }
    };

    const handleNavigateToCasting = () => {
        router.push(`/project/${projectId}/casting`);
    };

    const handleCharacterClick = (char: Character) => {
        setSelectedCharacter(char);
        setIsDetailOpen(true);
    };

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#13111C] text-white">Loading...</div>;
    }

    if (!project) return <div className="h-screen w-full flex items-center justify-center bg-[#13111C] text-white">Project not found</div>;

    return (
        <ProjectLayout projectId={project.id} projectTitle={project.title}>
            <div className="flex h-full relative overflow-y-auto bg-[#05050a]">

                {/* Background Ambience */}
                <div className="fixed top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-purple-900/5 rounded-full blur-[150px] pointer-events-none" />
                <div className="fixed bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="flex-1 flex flex-col items-center py-10 sm:py-12 md:py-16 relative z-10">
                    <div className="flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 sm:px-6 lg:px-8">
                        {/* PageHeading */}
                        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white sm:text-4xl">All Characters</h1>
                                <p className="text-gray-400">Manage your cast and view detailed profiles</p>
                            </div>
                            <button
                                onClick={handleNavigateToCasting}
                                className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#4a4aff] hover:bg-[#3d3dcc] px-6 text-sm font-bold leading-normal text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                            >
                                <span className="mr-2"><Plus size={16} /></span>
                                <span>New Character</span>
                            </button>
                        </div>

                        {/* ImageGrid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {/* Add Card */}
                            <div
                                onClick={handleNavigateToCasting}
                                className="aspect-[3/4] cursor-pointer rounded-xl border border-dashed border-gray-800 bg-[#0F0F12] flex flex-col items-center justify-center gap-2 hover:bg-[#15151A] hover:border-gray-700 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                    <Plus size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300">Add Character</span>
                            </div>

                            {characters.map((char) => {
                                const isGenerating = char.sheet_status === 'pending' || char.sheet_status === 'processing';
                                const isFailed = char.sheet_status === 'failed';
                                return (
                                    <div
                                        key={char.id}
                                        onClick={() => handleCharacterClick(char)}
                                        className={cn(
                                            "group relative rounded-xl overflow-hidden bg-[#0F0F12] border transition-all cursor-pointer",
                                            isFailed
                                                ? "border-red-500/50 hover:border-red-500"
                                                : "border-gray-800 hover:border-gray-700"
                                        )}
                                    >
                                        <div className="aspect-[3/4] bg-cover bg-center relative"
                                            style={char.profile_image_url && !isGenerating ? { backgroundImage: `url("${char.profile_image_url}")` } : {}}
                                        >
                                            {(!char.profile_image_url || isGenerating || isFailed) && (
                                                <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-gray-600 gap-2">
                                                    {isGenerating ? (
                                                        <>
                                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-[10px] text-primary font-mono animate-pulse">CREATING...</span>
                                                        </>
                                                    ) : isFailed ? (
                                                        <>
                                                            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                                                                <AlertCircle size={16} />
                                                            </div>
                                                            <span className="text-[10px] text-red-400 font-bold">FAILED</span>
                                                        </>
                                                    ) : (
                                                        <span className="font-bold text-xl">{char.name[0]}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                            <h4 className="text-white text-sm font-bold truncate">{char.name}</h4>
                                            <p className="text-xs text-gray-400 truncate">
                                                {Array.isArray(char.default_mood) ? char.default_mood.join(', ') : (char.default_mood || 'Neutral')}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <CharacterDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                character={selectedCharacter}
                onRetry={handleRetryCharacter}
            />
        </ProjectLayout>
    );
}
