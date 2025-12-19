
'use client';


import { useEffect, useState } from 'react';
import { useRouter } from '@/navigation';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ProjectLayout from '@/components/layout/ProjectLayout';
import CharacterDetailModal from '@/components/project/modals/CharacterDetailModal';
import SuggestionDetailModal from '@/components/project/modals/SuggestionDetailModal';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, AlertCircle, Sparkles, Users, X } from 'lucide-react';
import { SectionLabel } from '@/components/ui/section-label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    default_mood: string | string[];
    profile_image_url?: string;
    sheet_status?: 'pending' | 'processing' | 'completed' | 'failed';
    description?: string;
}

interface Suggestion {
    id: string;
    name: string;
    role?: string;
    theme_color?: string;
    bio?: string;
    personality?: string;
    stats?: Record<string, number>;
    visual_keywords?: string[];
    age?: string;
    personality_tags?: string[];
}

interface Project {
    id: string;
    title: string;
    style_preset?: string;
    suggestions_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function CharacterListPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('Project.Home');
    const tc = useTranslations('Project.Characters');
    const tCommon = useTranslations('Common');
    const projectId = params?.projectId as string;
    const [characters, setCharacters] = useState<Character[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const { toast } = useToast();

    // Modal State
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Suggestion Reject State
    const [suggestionToDelete, setSuggestionToDelete] = useState<Suggestion | null>(null);
    const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);

    // Suggestion Promote State
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [isSuggestionDetailOpen, setIsSuggestionDetailOpen] = useState(false);
    const [suggestionToPromote, setSuggestionToPromote] = useState<Suggestion | null>(null);
    const [isPromoteConfirmOpen, setIsPromoteConfirmOpen] = useState(false);
    const [promoteSource, setPromoteSource] = useState<'list' | 'modal'>('list');

    const fetchCharacters = async () => {
        if (!projectId) return;
        try {
            const charRes = await api.get(`/characters/?project_id=${projectId}`);
            setCharacters(charRes.data);
        } catch (err) {
            console.error("Failed to fetch characters", err);
        }
    };

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
                    setCharacters(res.data);

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

    // Poll for AI Suggestions
    useEffect(() => {
        if (!project || !projectId) return;

        let interval: NodeJS.Timeout;

        const checkSuggestions = async () => {
            try {
                const res = await api.get(`/characters/suggestions/${projectId}`);
                setSuggestions(res.data);

                if (res.data.length > 0 || project.suggestions_status === 'completed') {
                    setIsSuggestionsLoading(false);
                    if (interval) clearInterval(interval);
                }
            } catch (e) {
                console.error("Failed to fetch suggestions", e);
            }
        };

        checkSuggestions();

        if (project.suggestions_status === 'processing' || (project.suggestions_status === 'pending' && suggestions.length === 0)) {
            setIsSuggestionsLoading(true);
            interval = setInterval(checkSuggestions, 4000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [project?.id, project?.suggestions_status]);

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

    const handleRejectClick = (e: React.MouseEvent, suggestion: Suggestion) => {
        e.stopPropagation();
        setSuggestionToDelete(suggestion);
        setIsRejectConfirmOpen(true);
    };

    const handleRejectConfirm = async () => {
        if (!suggestionToDelete) return;
        try {
            await api.post(`/characters/suggestions/${suggestionToDelete.id}/reject`);
            setSuggestions(prev => prev.filter(s => s.id !== suggestionToDelete.id));
            toast({
                title: tc('rejectSuccess'),
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to reject suggestion",
                variant: 'destructive',
            });
        }
        setIsRejectConfirmOpen(false);
        setSuggestionToDelete(null);
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setIsSuggestionDetailOpen(true);
    };

    const handleCastNowClick = (e: React.MouseEvent, suggestion: Suggestion) => {
        e.stopPropagation();
        setSuggestionToPromote(suggestion);
        setPromoteSource('list');
        setIsPromoteConfirmOpen(true);
    };

    // Called from SuggestionDetailModal
    const handleCastFromModal = (suggestion: Suggestion) => {
        setIsSuggestionDetailOpen(false);
        setSuggestionToPromote(suggestion);
        setPromoteSource('modal');
        setTimeout(() => setIsPromoteConfirmOpen(true), 150);
    };

    const handlePromoteCancel = () => {
        if (promoteSource === 'modal' && suggestionToPromote) {
            setSelectedSuggestion(suggestionToPromote); // Ensure the correct suggestion is re-selected
            setIsSuggestionDetailOpen(true);
        }
    };

    const handlePromoteConfirm = async () => {
        if (!suggestionToPromote) return;
        try {
            await api.post(`/characters/suggestions/${suggestionToPromote.id}/promote`);

            // Optimistic Update: Remove from suggestions and add to characters (simplified)
            setSuggestions(prev => prev.filter(s => s.id !== suggestionToPromote.id));

            // We should refetch characters to see the new one
            await fetchCharacters();

            toast({
                title: tc('castSuccess'),
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to cast suggestion",
                variant: 'destructive',
            });
        }
        setIsPromoteConfirmOpen(false);
        setSuggestionToPromote(null);
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
                                <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white sm:text-4xl">{tc('title')}</h1>
                                <p className="text-gray-400">{tc('subtitle')}</p>
                            </div>
                            <button
                                onClick={handleNavigateToCasting}
                                className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#4a4aff] hover:bg-[#3d3dcc] px-6 text-sm font-bold leading-normal text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                            >
                                <span className="mr-2"><Plus size={16} /></span>
                                <span>{tc('newCharacter')}</span>
                            </button>
                        </div>

                        {/* Grid Content */}
                        <div className="flex flex-col gap-12">

                            {/* Section 1: Active Cast */}
                            <section>
                                <SectionLabel icon={<Users size={14} />} className="mb-4 text-purple-300">
                                    {tc('castList')} <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/70">{characters.length}</span>
                                </SectionLabel>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {/* Add Card */}
                                    <div
                                        onClick={handleNavigateToCasting}
                                        className="aspect-[3/4] cursor-pointer rounded-xl border border-dashed border-gray-800 bg-[#0F0F12] flex flex-col items-center justify-center gap-2 hover:bg-[#15151A] hover:border-gray-700 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                            <Plus size={20} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300">{tc('addCharacter')}</span>
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
                                                                    <span className="text-[10px] text-primary font-mono animate-pulse uppercase">{t('generating')}</span>
                                                                </>
                                                            ) : isFailed ? (
                                                                <>
                                                                    <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                                                                        <AlertCircle size={16} />
                                                                    </div>
                                                                    <span className="text-[10px] text-red-400 font-bold uppercase">{t('failed')}</span>
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
                            </section>

                            {/* Section 2: AI Suggestions (Only if exists or loading) */}
                            {(suggestions.length > 0 || project.suggestions_status === 'processing' || isSuggestionsLoading) && (
                                <section>
                                    <SectionLabel icon={<Sparkles size={14} />} className="mb-4 text-purple-300">
                                        {tc('suggestionList')} <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] text-purple-300 border border-purple-500/20">{suggestions.length}</span>
                                    </SectionLabel>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                        {/* Loading Card */}
                                        {(project.suggestions_status === 'processing' || isSuggestionsLoading) && (
                                            <div className="aspect-[3/4] rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center gap-3 p-4 text-center animate-pulse">
                                                <div className="w-10 h-10 rounded-full border-2 border-t-purple-500 border-r-purple-500/30 border-b-transparent border-l-transparent animate-spin" />
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{t('preparingSuggestions')}</p>
                                                    <p className="text-[9px] text-gray-500 leading-tight">{t('preparingSuggestionsDesc')}</p>
                                                </div>
                                            </div>
                                        )}

                                        {suggestions.map((suggestion) => (
                                            <div
                                                key={suggestion.id}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#15121c] border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer flex flex-col p-4"
                                                style={{ borderTop: suggestion.theme_color ? `4px solid ${suggestion.theme_color}` : undefined }}
                                            >
                                                {/* Reject Button */}
                                                <button
                                                    onClick={(e) => handleRejectClick(e, suggestion)}
                                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors z-20 opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={14} />
                                                </button>

                                                <div className="flex-1 flex flex-col justify-center items-center gap-2">
                                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-1">
                                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                                    </div>
                                                    <h4 className="text-white text-xs font-bold uppercase tracking-tight text-center">{suggestion.name}</h4>
                                                    <p className="text-[10px] text-purple-300/70 font-medium">{suggestion.role || "Potential Cast"}</p>
                                                </div>
                                                <div className="mt-auto pt-3 border-t border-white/5">
                                                    <p className="text-[10px] text-gray-500 line-clamp-3 leading-tight italic">
                                                        "{suggestion.bio || suggestion.personality}"
                                                    </p>
                                                </div>

                                                {/* Hover HUD */}
                                                <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors flex items-center justify-center pointer-events-none">
                                                    <div
                                                        onClick={(e) => handleCastNowClick(e as any, suggestion)}
                                                        className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300 pointer-events-auto hover:bg-purple-500 shadow-xl shadow-purple-900/40"
                                                    >
                                                        CAST NOW
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>

                <CharacterDetailModal
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    character={selectedCharacter}
                    onRetry={(id) => handleRetryCharacter(id)}
                    onDelete={fetchCharacters}
                />

                <SuggestionDetailModal
                    isOpen={isSuggestionDetailOpen}
                    onClose={() => setIsSuggestionDetailOpen(false)}
                    suggestion={selectedSuggestion}
                    onCast={handleCastFromModal}
                />

                <ConfirmationDialog
                    open={isRejectConfirmOpen}
                    onOpenChange={setIsRejectConfirmOpen}
                    title={tc('reject')}
                    description={tc('rejectConfirm')}
                    confirmLabel={tc('reject')}
                    cancelLabel={tCommon('cancel')}
                    onConfirm={handleRejectConfirm}
                    variant="destructive"
                />

                <ConfirmationDialog
                    open={isPromoteConfirmOpen}
                    onOpenChange={setIsPromoteConfirmOpen}
                    title={tc('castConfirm')}
                    description={tc('castConfirmDesc')}
                    confirmLabel={tc('castConfirm')}
                    cancelLabel={tCommon('cancel')}
                    onConfirm={handlePromoteConfirm}
                    onCancel={handlePromoteCancel}
                />
            </div>
        </ProjectLayout>
    );
}
