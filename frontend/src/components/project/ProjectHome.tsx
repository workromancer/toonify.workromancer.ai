'use client';

import { useState, useEffect } from 'react';
import ViewStyleModal from './modals/ViewStyleModal';
import { cn } from '@/lib/utils';
import { Link, useRouter, usePathname } from '@/navigation';
import { useSearchParams, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import ProjectLayout from '@/components/layout/ProjectLayout';
import EditProjectModal from './modals/EditProjectModal';
import GenerateEpisodeModal from './modals/GenerateEpisodeModal';
import ArtStyleSetupModal from './modals/ArtStyleSetupModal';
import CharacterDetailModal from './modals/CharacterDetailModal';
import SuggestionDetailModal from './modals/SuggestionDetailModal';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Sparkles, Clapperboard, Edit2, Palette, ArrowRight, Settings, Play, AlertCircle, ChevronDown, MoreVertical, LayoutTemplate, Calendar, Film, Clock, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SectionLabel } from '@/components/ui/section-label';
import ImageGeneratingPlaceholder from '@/components/ui/ImageGeneratingPlaceholder';
import { useTranslations } from 'next-intl';
import { CustomLoader } from '@/components/ui/custom-loader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Character {
    id?: string;
    name: string;
    description?: string;
    profile_image_url?: string;
    default_mood?: string | string[];
    sheet_status?: 'pending' | 'processing' | 'completed' | 'failed';
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
    description?: string;
    style_preset: string;
    thumbnail_url?: string;
    cover_image_status?: string | null;
    subtitle?: string;
    genre?: string;
    genre_id?: string | null;
    genres?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worldview?: any;
    art_style?: string;
    style_reference_url?: string;
    suggestions_status?: string;
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
    const [isArtStyleModalOpen, setIsArtStyleModalOpen] = useState(false);
    const [isViewStyleModalOpen, setIsViewStyleModalOpen] = useState(false);
    const [isCharacterDetailOpen, setIsCharacterDetailOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

    // Suggestion Promote State
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [isSuggestionDetailOpen, setIsSuggestionDetailOpen] = useState(false);
    const [suggestionToPromote, setSuggestionToPromote] = useState<Suggestion | null>(null);
    const [isPromoteConfirmOpen, setIsPromoteConfirmOpen] = useState(false);
    const [promotingSuggestionId, setPromotingSuggestionId] = useState<string | null>(null);

    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const params = useParams();
    const t = useTranslations('Project.Home');
    const tGenres = useTranslations('NewProject.genres');
    
    // Use URL params for navigation to avoid undefined issues
    const urlProjectId = params?.projectId as string;
    const safeProjectId = urlProjectId || project.id;

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const descriptionText = project.description || project.worldview?.content || project.worldview?.description || t('noDesc');
    const isLongDescription = descriptionText.length > 200;

    // Suggestion State
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [isAiRecommending, setIsAiRecommending] = useState(false);

    const handleAiRecommend = async () => {
        setIsAiRecommending(true);
        try {
            await api.post('/characters/suggestions/batch', { project_id: project.id });
            toast({ title: t('recommendations'), description: t('preparingSuggestionsDesc') });
            // Polling will automatically update suggestions
            setIsSuggestionsLoading(true);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to generate AI recommendations', variant: 'destructive' });
        } finally {
            setIsAiRecommending(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkSuggestions = async () => {
            try {
                const res = await api.get(`/characters/suggestions/${project.id}`);
                setSuggestions(res.data);

                // If suggestions status is completed or we have items, we can stop polling unless it's still processing
                if (res.data.length > 0 || project.suggestions_status === 'completed') {
                    setIsSuggestionsLoading(false);
                    if (interval) clearInterval(interval);
                }
            } catch (e) {
                console.error("Failed to fetch suggestions", e);
            }
        };

        // Initial check
        checkSuggestions();

        // Start polling if status is processing or no suggestions found yet on a new project
        if (project.suggestions_status === 'processing' || (project.suggestions_status === 'pending' && suggestions.length === 0)) {
            setIsSuggestionsLoading(true);
            interval = setInterval(checkSuggestions, 4000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [project.id, project.suggestions_status]);

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
                                title: t('coverGenerated'),
                                description: t('coverSuccess'),
                            });
                        } else if (updatedProject.cover_image_status === 'failed') {
                            toast({
                                title: t('genFailed'),
                                description: t('coverFailed'),
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
        if ((!project.genres || project.genres.length === 0) && !project.genre) {
            toast({
                title: t('missingInfo'),
                description: t('setGenreFirst'),
                // variant: 'default', // Changed from destructive to friendly
            });
            setIsEditModalOpen(true);

            // Check worldview
            if (!project.worldview) return;
            return;
        }

        try {
            // Optimistic update
            onProjectUpdate({ ...project, cover_image_status: 'processing' });

            await api.post(`/projects/${project.id}/cover`);

            toast({
                title: t('genStarted'),
                description: t('creatingCover'),
            });
        } catch (e) {
            console.error(e);
            toast({
                title: t('reqFailed'),
                description: t('startCoverFailed'),
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
                title: t('retryFailed'),
                description: t('charRetryFailed'),
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

    const handleSuggestionClick = (e: React.MouseEvent, suggestion: Suggestion) => {
        e.stopPropagation(); // Avoid parent click if necessary, though cards are usually standalone
        setSelectedSuggestion(suggestion);
        setIsSuggestionDetailOpen(true);
    };

    const handleCastNowClick = (e: React.MouseEvent, suggestion: Suggestion) => {
        e.stopPropagation();
        setSuggestionToPromote(suggestion);
        setIsPromoteConfirmOpen(true);
    };

    const handleCastFromModal = (suggestion: Suggestion) => {
        setIsSuggestionDetailOpen(false);
        setSuggestionToPromote(suggestion);
        setTimeout(() => setIsPromoteConfirmOpen(true), 150);
    };

    const handlePromoteConfirm = async () => {
        if (!suggestionToPromote || promotingSuggestionId) return;
        setPromotingSuggestionId(suggestionToPromote.id);
        try {
            await api.post(`/characters/suggestions/${suggestionToPromote.id}/promote`);

            // Optimistic Update
            setSuggestions(prev => prev.filter(s => s.id !== suggestionToPromote.id));
            if (onRefreshCharacters) onRefreshCharacters();

            toast({
                title: t('castSuccess'),
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: t('castFailed'),
                variant: 'destructive',
            });
        } finally {
            setPromotingSuggestionId(null);
        }
        setIsPromoteConfirmOpen(false);
        setSuggestionToPromote(null);
    };

    // Check for setup query param
    useEffect(() => {
        if (searchParams && searchParams.get('setup') === 'true') {
            const timer = setTimeout(() => {
                setIsArtStyleModalOpen(true);
                const params = new URLSearchParams(searchParams);
                params.delete('setup');
                router.replace(`${pathname}?${params.toString()}`);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [searchParams, router, pathname]);

    const handleStyleClick = () => {
        if (project.style_preset && project.style_preset !== 'anime_webtoon') {
            setIsViewStyleModalOpen(true);
        } else {
            setIsArtStyleModalOpen(true);
        }
    };

    // Priority Logic for CTA
    const getHeroAction = () => {
        // Priority 1: Missing Settings
        if ((!project.genres || project.genres.length === 0) && !project.genre || !project.worldview) {
            return {
                label: t('setupProject'),
                Icon: Settings,
                onClick: () => setIsEditModalOpen(true),
                variant: 'primary',
                description: t('setupDesc'),
                isLoader: false
            };
        }

        // Priority 2: Missing Art Style
        if (!project.style_preset) {
            return {
                label: t('selectStyle'),
                Icon: Palette,
                onClick: () => setIsArtStyleModalOpen(true),
                variant: 'primary',
                description: t('selectStyleDesc'),
                isLoader: false
            };
        }

        // Priority 3: No Characters -> scroll to cast section
        if (!characters || characters.length === 0) {
            const hasSuggestions = suggestions.length > 0 && project.suggestions_status === 'completed';
            const isProcessing = project.suggestions_status === 'processing';
            return {
                label: isProcessing ? t('preparingSuggestions') : (hasSuggestions ? t('suggestionsReady') : t('addChar')),
                Icon: isProcessing ? null : Sparkles,
                onClick: () => {
                    document.getElementById('cast-section')?.scrollIntoView({ behavior: 'smooth' });
                },
                variant: isProcessing ? 'magic' : 'primary',
                disabled: isProcessing,
                description: isProcessing ? t('preparingSuggestionsDesc') : (hasSuggestions ? t('suggestionsReadyDesc') : t('addCharDesc')),
                isLoader: isProcessing
            };
        }

        // Priority 4: Missing or Failed Cover (Default Action)
        if (project.thumbnail_url && !isCoverProcessing) {
            return null;
        }

        return {
            label: isCoverProcessing ? t('generating') : t('genAiCover'),
            Icon: isCoverProcessing ? null : Sparkles,
            onClick: handleGenerateCover,
            disabled: isCoverProcessing,
            variant: 'magic',
            description: t('genAiCoverDesc'),
            isLoader: isCoverProcessing
        };
    };

    const heroAction = getHeroAction();

    return (
        <ProjectLayout projectId={project.id} projectTitle={project.title}>
            <div className="flex h-full relative overflow-y-auto bg-[#0A0A0B]" onClick={() => setIsMenuOpen(false)}>
                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Hero Section */}
                    <div className="relative w-full h-[50vh] md:aspect-[21/9] md:h-auto md:max-h-[400px] bg-black group overflow-visible">
                        <div
                            className={cn(
                                "absolute inset-0 bg-cover bg-center transition-all duration-700 overflow-hidden",
                                isCoverProcessing && "opacity-50 filter blur-sm"
                            )}
                            style={{
                                backgroundImage: project.thumbnail_url ? `url("${project.thumbnail_url}")` : undefined,
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/60 to-transparent pointer-events-none" />

                        {/* Status Overlay for Processing */}
                        {isCoverProcessing && (
                            <ImageGeneratingPlaceholder text={t('generatingCoverArt')} />
                        )}

                        {/* Async Suggestions Banner */}
                        {project.suggestions_status === 'processing' && (
                            <div className="absolute top-0 left-0 w-full bg-purple-600/90 py-2 px-4 flex items-center justify-center gap-3 backdrop-blur-md z-20 animate-in slide-in-from-top-full duration-500">
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                <span className="text-sm font-bold text-white tracking-wide shadow-sm">
                                    {t('brainstormingBanner')}
                                </span>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full p-4 pt-16 sm:p-12 sm:pt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 sm:gap-6 z-10">
                            <div className="flex flex-col gap-2 sm:gap-4 max-w-2xl">
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    {/* Genres */}
                                    {project.genres && project.genres.length > 0 ? (
                                        project.genres.map((gName, idx) => (
                                            <span key={idx} className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] sm:text-xs font-bold text-white border border-white/20">
                                                {tGenres(gName.toLowerCase().replace(/\s/g, '') as any)}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] sm:text-xs font-bold text-white border border-white/20">
                                            {/* Legacy Display */}
                                            {(() => {
                                                const knownGenres = ['fantasy', 'romance', 'sciFi', 'sliceOfLife', 'action', 'thriller', 'historical', 'comedy', 'mystery', 'horror'];
                                                if (project.genre_id && knownGenres.includes(project.genre_id)) {
                                                    return tGenres(project.genre_id);
                                                }
                                                if (Array.isArray(project.genre)) return project.genre.join(', ');
                                                if (project.genre) return project.genre;
                                                return t('genreNotSet');
                                            })()}
                                        </span>
                                    )}
                                    {project.worldview?.tone && Array.isArray(project.worldview.tone) && project.worldview.tone.map((t: string) => (
                                        <span key={t} className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-purple-500/20 backdrop-blur-md text-[10px] sm:text-xs font-bold text-purple-200 border border-purple-500/30">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                                    {project.title}
                                </h1>
                                <div className="max-w-xl hidden sm:block">
                                    <p className={cn("text-sm sm:text-lg text-gray-300 font-medium transition-all", isDescriptionExpanded ? "" : "line-clamp-2")}>
                                        {descriptionText}
                                    </p>
                                    {isLongDescription && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsDescriptionExpanded(!isDescriptionExpanded);
                                            }}
                                            className="text-sm text-purple-400 hover:text-white mt-1 font-bold flex items-center gap-1"
                                        >
                                            {isDescriptionExpanded ? (
                                                <><ChevronDown className="rotate-180 w-3 h-3" />{t('showLess')}</>
                                            ) : (
                                                <><ChevronDown className="w-3 h-3" />{t('showMore')}</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 relative self-end sm:self-auto">
                                {/* Primary CTA */}
                                {heroAction && (
                                    <Button
                                        size="lg"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            heroAction.onClick();
                                        }}
                                        disabled={heroAction.disabled}
                                        className={cn(
                                            "h-11 w-11 sm:h-12 sm:w-auto sm:px-6 rounded-full text-sm sm:text-base font-bold shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1",
                                            heroAction.variant === 'magic'
                                                ? "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                                                : "bg-white text-black hover:bg-gray-100",
                                            heroAction.disabled && "cursor-not-allowed opacity-70"
                                        )}
                                    >
                                        {heroAction.isLoader ? (
                                            <CustomLoader size={16} className="sm:mr-2" />
                                        ) : heroAction.Icon ? (
                                            <heroAction.Icon className="h-4 w-4 sm:mr-2" />
                                        ) : null}
                                        <span className="hidden sm:inline">{heroAction.label}</span>
                                    </Button>
                                )}

                                {/* Tooltip Menu Trigger */}
                                <div className="relative">
                                    <Button
                                        size="icon"
                                        className="h-11 w-11 sm:h-12 sm:w-12 bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(!isMenuOpen);
                                        }}
                                    >
                                        <MoreVertical size={18} className="sm:w-5 sm:h-5" />
                                    </Button>

                                    {/* Dropdown Menu */}
                                    {isMenuOpen && (
                                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#18181B] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-white/5 bg-white/5">
                                                {t('controls')}
                                            </div>

                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsEditModalOpen(true);
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <Settings size={16} />
                                                {t('settings')}
                                            </button>

                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStyleClick();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <Palette size={16} />
                                                {project.style_preset ? t('viewStyle') : t('selectStyleAction')}
                                            </button>

                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateCover();
                                                    setIsMenuOpen(false);
                                                }}
                                                disabled={isCoverProcessing}
                                            >
                                                <LayoutTemplate size={16} />
                                                {project.thumbnail_url ? t('regenCover') : t('genCover')}
                                            </button>


                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Content Section (Episodes & Characters) */}
                    <div className="flex-1 p-6 md:p-8 bg-[#0A0A0B]">
                        <div className="max-w-7xl mx-auto flex flex-col gap-12">

                            {/* Worldview Key Features */}
                            {project.worldview?.key_features && Array.isArray(project.worldview.key_features) && (
                                <section className="mb-4">
                                    <SectionLabel icon={<Sparkles size={12} />} className="mb-3 text-gray-400">{t('keyFeatures')}</SectionLabel>
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

                            {/* AI Suggestions CTA Banner */}
                            {project.suggestions_status === 'completed' && suggestions.length > 0 && characters.length === 0 && (
                                <div
                                    className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-indigo-900/40 border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer group shadow-2xl shadow-purple-900/20 mb-4"
                                >
                                    {/* Ambient Glow */}
                                    <div className="absolute top-[-50%] left-[-10%] w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-purple-600/30 transition-all" />

                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity translate-x-1/4 -translate-y-1/4">
                                        <Sparkles size={180} />
                                    </div>

                                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="flex gap-6 items-center">
                                            <Button
                                                variant="ghost"
                                                className="absolute inset-0 w-full h-full p-0 opacity-0 z-10"
                                                onClick={() => {
                                                    document.getElementById('cast-section')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                            />
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/40 shrink-0 transform group-hover:scale-110 transition-transform duration-500">
                                                <Users size={32} className="text-white" />
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h3 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">
                                                    {t('suggestionsReady')}
                                                </h3>
                                                <p className="text-gray-400 text-sm max-w-lg leading-relaxed font-medium">
                                                    {t('suggestionsReadyDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 w-full md:w-auto">
                                            <Button className="bg-white text-black hover:bg-gray-100 font-black px-10 rounded-full h-14 shrink-0 shadow-xl shadow-black/20 text-md group-hover:scale-105 transition-all">
                                                {t('cast')} <ArrowRight size={18} className="ml-2" />
                                            </Button>
                                            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest text-center animate-pulse">
                                                NEW CONCEPTS GENERATED
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <section id="cast-section">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                                        {t('cast')}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {/* Desktop: Full buttons */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    className="hidden sm:flex bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 h-8 text-xs font-bold shadow-lg shadow-purple-900/20"
                                                >
                                                    <Plus size={14} className="mr-1.5" />
                                                    {t('addChar')}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#18181B] border-white/10 text-gray-200">
                                                <DropdownMenuItem
                                                    className="focus:bg-white/10 cursor-pointer"
                                                    onClick={() => router.push(`/project/${safeProjectId}/casting`)}
                                                >
                                                    <Plus size={14} className="mr-2" />
                                                    {t('manualAdd')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            size="sm"
                                            onClick={handleAiRecommend}
                                            disabled={isAiRecommending || project.suggestions_status === 'processing'}
                                            className="hidden sm:flex bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full px-4 h-8 text-xs font-bold shadow-lg disabled:opacity-50"
                                        >
                                            {(isAiRecommending || project.suggestions_status === 'processing') ? (
                                                <><Loader2 size={14} className="mr-1.5 animate-spin" />{t('aiRecommending')}</>
                                            ) : (
                                                <><Sparkles size={14} className="mr-1.5" />{t('aiRecommend')}</>
                                            )}
                                        </Button>
                                        
                                        {/* Mobile: Icon buttons */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    className="sm:hidden w-10 h-10 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg shadow-purple-900/20"
                                                >
                                                    <Plus size={18} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#18181B] border-white/10 text-gray-200">
                                                <DropdownMenuItem
                                                    className="focus:bg-white/10 cursor-pointer"
                                                    onClick={() => router.push(`/project/${safeProjectId}/casting`)}
                                                >
                                                    <Plus size={14} className="mr-2" />
                                                    {t('manualAdd')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            size="icon"
                                            onClick={handleAiRecommend}
                                            disabled={isAiRecommending || project.suggestions_status === 'processing'}
                                            className="sm:hidden w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-lg disabled:opacity-50"
                                        >
                                            {(isAiRecommending || project.suggestions_status === 'processing') ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Sparkles size={18} />
                                            )}
                                        </Button>
                                        
                                        {/* View All - Hidden on mobile */}
                                        <Link href={`/project/${safeProjectId}/characters`} className="hidden sm:block">
                                            <Button variant="ghost" size="sm" className="text-sm text-gray-400 hover:text-white">{t('viewAll')} <ArrowRight size={14} className="ml-1" /></Button>
                                        </Link>
                                    </div>
                                </div>
                                {/* Mobile: 3-column grid, Desktop: 4-6 columns */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div
                                                className="aspect-[3/4] cursor-pointer rounded-xl border border-dashed border-gray-800 bg-[#0F0F12] flex flex-col items-center justify-center gap-2 hover:bg-[#15151A] hover:border-gray-700 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                                    <Plus size={16} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-300">{t('addChar')}</span>
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="bg-[#18181B] border-white/10 text-gray-200">
                                            <DropdownMenuItem
                                                className="focus:bg-white/10 cursor-pointer"
                                                onClick={() => router.push(`/project/${safeProjectId}/casting`)}
                                            >
                                                <Plus size={14} className="mr-2" />
                                                {t('manualAdd')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>


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
                                                        <ImageGeneratingPlaceholder text={t('creating')} />
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
                                                            <span className="text-[10px] text-red-400 font-bold">{t('failed')}</span>
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

                                    {/* Brainstorming Card */}
                                    {(project.suggestions_status === 'processing' || (isSuggestionsLoading && suggestions.length === 0)) && (
                                        <div className="aspect-[3/4] rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center gap-3 p-2 sm:p-4 text-center animate-pulse">
                                            <CustomLoader size={40} />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{t('preparingSuggestions')}</p>
                                                <p className="text-[9px] text-gray-500 leading-tight">{t('preparingSuggestionsDesc')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Suggestions Cards (Top 3) */}
                                    {suggestions.length > 0 && suggestions.slice(0, 3).map((suggestion, idx) => (
                                        <div
                                            key={suggestion.id}
                                            onClick={(e) => handleSuggestionClick(e, suggestion)}
                                            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#15121c] border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer flex flex-col p-2 sm:p-3"
                                            style={{ borderTop: suggestion.theme_color ? `3px solid ${suggestion.theme_color}` : undefined }}
                                        >
                                            <div className="flex-1 flex flex-col justify-center items-center gap-1">
                                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-1">
                                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                                </div>
                                                <h4 className="text-white text-[10px] font-bold uppercase tracking-tight text-center">{suggestion.name}</h4>
                                                <p className="text-[9px] text-purple-300/70 font-medium">{suggestion.role || "Potential Cast"}</p>
                                            </div>
                                            <div className="mt-auto pt-2 border-t border-white/5">
                                                <p className="text-[9px] text-gray-500 line-clamp-2 leading-tight italic">
                                                    "{suggestion.bio || suggestion.personality}"
                                                </p>
                                            </div>

                                            {/* Hover HUD */}
                                            <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors flex items-center justify-center pointer-events-none">
                                                <div
                                                    onClick={(e) => !promotingSuggestionId && handleCastNowClick(e, suggestion)}
                                                    className={cn(
                                                        "bg-purple-600 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300 pointer-events-auto shadow-xl shadow-purple-900/40",
                                                        promotingSuggestionId === suggestion.id ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-500"
                                                    )}
                                                >
                                                    {promotingSuggestionId === suggestion.id ? <Loader2 size={12} className="inline mr-1 animate-spin" /> : null}
                                                    {promotingSuggestionId === suggestion.id ? 'CASTING...' : 'CAST NOW'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>


                            {/* Episodes List */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {t('episodes')} <span className="text-slate-500 text-sm font-normal ml-1 translate-y-[1px]">{episodes?.length || 0}</span>
                                    </h3>
                                    <Button
                                        className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/20 text-xs flex items-center gap-2"
                                        onClick={() => setIsEpisodeModalOpen(true)}
                                    >
                                        <Plus size={16} /> {t('newEpisode')}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {episodes && episodes.length > 0 ? (
                                        episodes.map((ep, idx) => (
                                            <div
                                                key={ep.id}
                                                onClick={() => router.push(`/project/${safeProjectId}/editor?episode_id=${ep.id}`)}
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
                                                            {ep.thumbnail_url ? t('ready') : t('draft')}
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
                                                            {t('episode')} {ep.episode_order || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-800 rounded-xl bg-[#0f0f16]">
                                            <div className="p-3 rounded-full bg-slate-800/50 text-slate-500">
                                                <Clapperboard size={24} />
                                            </div>
                                            <p className="text-sm text-slate-500">{t('noEpisodes')}</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ViewStyleModal
                isOpen={isViewStyleModalOpen}
                onClose={() => setIsViewStyleModalOpen(false)}
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
                isOpen={isArtStyleModalOpen}
                onClose={() => setIsArtStyleModalOpen(false)}
                projectId={project.id}
                currentStyle={project.style_preset}
                onStyleUpdate={(newStyle: string) => onProjectUpdate({ ...project, style_preset: newStyle })}
                projectTitle={project.title}
                projectGenre={project.genre}
            />
            <CharacterDetailModal
                isOpen={!!selectedCharacter}
                onClose={() => setSelectedCharacter(null)}
                character={selectedCharacter}
                onRetry={handleCharacterRetry}
                onDelete={onRefreshCharacters}
            />

            <SuggestionDetailModal
                isOpen={isSuggestionDetailOpen}
                onClose={() => setIsSuggestionDetailOpen(false)}
                suggestion={selectedSuggestion}
                onCast={handleCastFromModal}
            />

            <ConfirmationDialog
                open={isPromoteConfirmOpen}
                onOpenChange={setIsPromoteConfirmOpen}
                title={t('castConfirm')}
                description={t('castConfirmDesc')}
                confirmLabel={t('castConfirm')}
                cancelLabel={useTranslations('Common')('cancel')}
                onConfirm={handlePromoteConfirm}
            />


        </ProjectLayout >
    );
}
