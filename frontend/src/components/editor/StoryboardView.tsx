'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

import { Plus, Image as ImageIcon, Trash2, Clapperboard, Loader2, Wand2, Sparkles, RefreshCw, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import MobileEpisodeViewer from '@/components/viewer/MobileEpisodeViewer';
import { useTranslations } from 'next-intl';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StoryCut {
    id: string;
    cut_order: number;
    script: string;
    aspect_ratio: string;
    image_path?: string;
    dialogues: unknown[];
    appearing_characters?: string[];
    status?: string;
}

interface DirectorOption {
    id: string;
    label: string;
    description: string;
    aspect_ratio: string;
    image_prompt: string;
}

interface StoryboardViewProps {
    projectId: string;
}

export default function StoryboardView({ projectId }: StoryboardViewProps) {
    const { activeEpisodeId, setActiveCut, activeCutId, isReviewMode, setReviewMode } = useCanvasStore(); // Added activeCutId to track selection
    const [cuts, setCuts] = useState<StoryCut[]>([]);
    const [loading, setLoading] = useState(false);
    const [episodeStatus, setEpisodeStatus] = useState<string>('ready'); // Track episode status
    const { toast } = useToast();
    const t = useTranslations('Project.Editor');
    const tc = useTranslations('Common');

    // Director Mode State
    const [isDirectorMode, setIsDirectorMode] = useState(false);
    const [scriptInput, setScriptInput] = useState('');
    const [directorOptions, setDirectorOptions] = useState<DirectorOption[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isRendering, setIsRendering] = useState<string | null>(null); // storing option ID being rendered
    const [modifyingCut, setModifyingCut] = useState<StoryCut | null>(null); // For Director's Cut modal
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);


    // Reuse existing handlers...
    const handleGenerateAll = async () => {
        // Sort cuts by order to ensure sequential context
        const sortedCuts = [...cuts].sort((a, b) => a.cut_order - b.cut_order);
        const cutsToGenerate = sortedCuts.filter(c => !c.image_path && !generatingIds.has(c.id));

        if (cutsToGenerate.length === 0) {
            toast({ title: t('toasts.noCuts'), description: t('toasts.noCutsDesc') });
            return;
        }

        setIsBatchGenerating(true);
        toast({ title: t('toasts.batchStart'), description: t('toasts.batchStartDesc', { count: cutsToGenerate.length }) });

        for (const cut of cutsToGenerate) {
            // We await each generation to ensure the next one has the previous one's context (image)
            const success = await handleGenerateImage(cut.id, true); // true = allow refetching/updating UI intermediate if needed
            if (!success) {
                toast({ title: t('toasts.interrupted'), description: t('toasts.interruptedDesc', { order: cut.cut_order }), variant: "destructive" });
                break;
            }
        }
        setIsBatchGenerating(false);
    };

    const fetchCuts = async () => {
        if (!activeEpisodeId) return;
        try {
            setLoading(true);
            const epRes = await api.get(`/episodes/${activeEpisodeId}`);
            setEpisodeStatus(epRes.data.status || 'ready');

            if (epRes.data.status !== 'generating') {
                const res = await api.get(`/cuts/?episode_id=${activeEpisodeId}`);
                setCuts(res.data);
            } else {
                setCuts([]); // Clear cuts if regenerating full episode? Or keep old?
                // Usually if generating, we might not have cuts yet or they are being replaced.
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Poll for episode status if generating
    useEffect(() => {
        if (episodeStatus !== 'generating' || !activeEpisodeId) return;

        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/episodes/${activeEpisodeId}`);
                const status = res.data.status;
                setEpisodeStatus(status);

                if (status === 'ready') {
                    await fetchCuts();
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [episodeStatus, activeEpisodeId]);

    const handleDirectorSuggest = async () => {
        if (!scriptInput.trim()) return;
        try {
            setIsSuggesting(true);
            const res = await api.post('/scenes/structure', {
                script: scriptInput,
                project_id: projectId
            });
            if (res.data && res.data.options) {
                setDirectorOptions(res.data.options);
            }
        } catch (err) {
            console.error("Director Suggest Error", err);
            toast({
                title: t('toasts.suggestionFailed'),
                description: "Failed to get suggestions from Director AI.", // Keep generic fallback or translate if critical
                variant: 'destructive',
            });
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleOptionSelect = async (option: DirectorOption) => {
        if (!activeEpisodeId) return;
        try {
            setIsRendering(option.id);

            // 1. Render the image
            const renderRes = await api.post('/scenes/render', {
                prompt: option.image_prompt,
                width: option.aspect_ratio === '16:9' ? 1024 : 768, // Simple logic for now
                height: 1024
            });
            const imageUrl = renderRes.data.image_url;

            // 2. Save the Cut
            const nextOrder = cuts.length > 0 ? cuts[cuts.length - 1].cut_order + 1 : 1;
            await api.post('/cuts', {
                episode_id: activeEpisodeId,
                cut_order: nextOrder,
                script: scriptInput,
                selected_layout: 'single',
                aspect_ratio: option.aspect_ratio,
                image_path: imageUrl,
                dialogues: []
            });

            // 3. Reset and Refresh
            setIsDirectorMode(false);
            setScriptInput('');
            setDirectorOptions([]);
            fetchCuts();

        } catch (err) {
            console.error("Render & Save Error", err);
            toast({
                title: t('toasts.creationFailed'),
                description: "Failed to create cut. Please try again.",
                variant: 'destructive',
            });
        } finally {
            setIsRendering(null);
        }
    };

    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

    const handleDeleteConfirm = async (id: string) => {
        try {
            await api.delete(`/cuts/${id}`);
            fetchCuts();
            toast({
                title: t('toasts.sceneDeleted'),
                description: "The scene has been removed.",
            });
        } catch (err) {
            console.error("Failed to delete cut", err);
            toast({
                title: t('toasts.deleteFailed'),
                description: "Failed to delete scene.",
                variant: 'destructive',
            });
        }
    };

    const handleExport = async (format: 'zip' | 'webtoon') => {
        if (!activeEpisodeId) return;
        try {
            toast({ title: "Exporting...", description: "Preparing your download." });
            const response = await api.post(`/episodes/${activeEpisodeId}/export?format=${format}`, {}, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Try to extract filename from header
            const contentDisposition = response.headers['content-disposition'];
            let filename = `episode_export.${format === 'zip' ? 'zip' : 'png'}`;
            if (contentDisposition) {
                // Check for standard filename
                let fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    filename = fileNameMatch[1];
                }

                // Check for UTF-8 encoded filename (overrides standard)
                const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
                if (utf8Match && utf8Match.length === 2) {
                    filename = decodeURIComponent(utf8Match[1]);
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Export failed", err);
            toast({ title: "Export Failed", description: "Could not download the file.", variant: "destructive" });
        }
    };

    const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

    const handleGenerateImage = async (cutId: string, isBatch = false): Promise<boolean> => {
        try {
            setGeneratingIds(prev => new Set(prev).add(cutId));

            // 1. Kick off generation
            await api.post(`/episodes/${activeEpisodeId}/cuts/${cutId}/generate-image`, {});

            if (!isBatch) {
                toast({
                    title: t('toasts.genStarted'),
                    description: "AI is generating the image...",
                });
            }

            // 2. Poll for completion
            // Poll for up to 180 seconds (90 attempts * 2s)
            const maxAttempts = 90;
            let attempts = 0;

            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 2000));

                try {
                    const res = await api.get(`/cuts/${cutId}`);
                    const updatedCut = res.data;

                    if (updatedCut.image_path) {
                        // Success!
                        // Update local state immediately to reflect change without full refetch if we want, 
                        // but fetchCuts() is safer for sync.
                        fetchCuts();

                        setGeneratingIds(prev => {
                            const next = new Set(prev);
                            next.delete(cutId);
                            return next;
                        });
                        return true;
                    }
                    // Fail fast if status is 'failed'
                    if (updatedCut.status === 'failed') {
                        throw new Error('Generation failed on server');
                    }

                } catch (pollErr) {
                    console.error("Polling error", pollErr);
                    if (String(pollErr).includes("Generation failed")) throw pollErr;
                }

                attempts++;
            }

            // Timeout
            toast({ title: t('toasts.genTimeout'), description: "Image generation took too long.", variant: "destructive" });
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(cutId);
                return next;
            });
            return false;

        } catch (e) {
            console.error("Gen Image Failed", e);
            toast({ title: t('toasts.genFailed'), variant: "destructive" });
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(cutId);
                return next;
            });
            return false;
        }
    };


    useEffect(() => {
        if (activeEpisodeId) {
            fetchCuts();
        } else {
            setCuts([]);
        }
    }, [activeEpisodeId]);

    if (!activeEpisodeId) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500 bg-[#05050a] font-mono text-sm">
                Select an episode to view storyboard.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#05050a] relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 z-0" />

            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0f0f16] shrink-0 z-10">
                <h2 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Clapperboard size={16} className="text-purple-500" />
                    {t('storyboardTitle')}
                </h2>
                <div className="flex gap-2">
                    {cuts.some(c => !c.image_path) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateAll}
                            disabled={isBatchGenerating}
                            className="h-7 text-xs border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-300"
                        >
                            {isBatchGenerating ? <Loader2 className="animate-spin mr-1" size={12} /> : <Sparkles size={12} className="mr-1" />}
                            {cuts.some(c => c.image_path) ? t('resumeGeneration') : t('generateAll')}
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-white">
                                <Download size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-[#13131c] border-slate-800 text-slate-200">
                            <DropdownMenuItem onClick={() => handleExport('zip')} className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
                                <span>{t('exportZip')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('webtoon')} className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
                                <span>{t('exportWebtoon')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                <div className="w-full max-w-2xl mx-auto space-y-6 pb-20">

                    {loading ? (
                        <div className="text-slate-500 text-center py-10 flex flex-col items-center">
                            <Loader2 className="animate-spin mb-2 text-slate-600" />
                            <span className="text-xs">{t('loadingScenes')}</span>
                        </div>
                    ) : episodeStatus === 'generating' ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 min-h-[300px] text-center">
                            <div className="w-16 h-16 relative mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={20} className="text-white animate-pulse" fill="currentColor" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{t('generatingEpisode')}</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                                {t('generatingDesc')}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></div>
                            </div>
                        </div>
                    ) : cuts.length === 0 && !isDirectorMode ? (
                        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-[#0f0f16]">
                            <div className="text-slate-500 italic mb-4 text-sm">{t('noScenes')}</div>
                            <Button
                                onClick={() => setIsDirectorMode(true)}
                                className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 font-bold"
                            >
                                <Wand2 size={16} className="mr-2" /> {t('startDirectorMode')}
                            </Button>
                        </div>
                    ) : (
                        cuts.map((cut, index) => (
                            <div
                                key={cut.id}
                                onClick={() => setActiveCut(cut.id)}
                                className={`
                                    group relative bg-[#0f0f16] border rounded-xl overflow-hidden transition-all cursor-pointer
                                    ${activeCutId === cut.id
                                        ? 'border-purple-500 ring-1 ring-purple-500/50 shadow-2xl scale-[1.01]'
                                        : 'border-slate-800 hover:border-slate-600 opacity-90 hover:opacity-100'}
                                `}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-[#13131c] border-b border-slate-800">
                                    <span className="text-xs font-bold text-slate-400 font-mono">{t('sceneHeader', { order: String(cut.cut_order).padStart(2, '0') })}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="p-1 hover:text-purple-400 text-slate-500 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setModifyingCut(cut); }}
                                            title="Refine with AI"
                                        >
                                            <Sparkles size={12} />
                                        </button>
                                        <ConfirmationDialog
                                            open={deleteConfirmationId === cut.id}
                                            onOpenChange={(open) => !open && setDeleteConfirmationId(null)}
                                            title={tc('delete')}
                                            description={tc('deleteConfirm')}
                                            confirmLabel={tc('delete')}
                                            cancelLabel={tc('cancel')}
                                            onConfirm={() => handleDeleteConfirm(cut.id)}
                                            variant="destructive"
                                            trigger={
                                                <button
                                                    className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(cut.id); }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Content Grid */}
                                <div className="flex min-h-[160px]">
                                    {/* Image Area */}
                                    <div className={`w-1/2 bg-slate-900 relative flex items-center justify-center border-r border-slate-800 overflow-hidden`}>
                                        {cut.image_path && !generatingIds.has(cut.id) && cut.status !== 'generating' ? (
                                            <img src={cut.image_path} alt="Cut" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-slate-600 flex flex-col items-center gap-2">
                                                {generatingIds.has(cut.id) || cut.status === 'generating' ? (
                                                    <>
                                                        <RefreshCw className="animate-spin text-purple-500" size={24} />
                                                        <span className="text-[10px] text-purple-400">{t('rendering')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ImageIcon size={32} className="opacity-30" />
                                                        <span className="text-[10px] opacity-50">{t('noImage')}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={isBatchGenerating}
                                                            onClick={(e) => { e.stopPropagation(); handleGenerateImage(cut.id); }}
                                                            className={`h-6 text-[10px] mt-1 border border-slate-700 ${isBatchGenerating ? 'bg-slate-900 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'}`}
                                                        >
                                                            {isBatchGenerating ? t('waiting') : t('generate')}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                    </div>

                                    {/* Script Area */}
                                    <div className="w-1/2 p-4 flex flex-col">
                                        <span className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-wider">{t('visualScript')}</span>
                                        <p className="text-sm text-slate-300 leading-relaxed font-serif italic line-clamp-4 flex-1">
                                            &quot;{cut.script}&quot;
                                        </p>
                                        <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-between items-center">
                                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700 font-mono">{cut.aspect_ratio || '1:1'}</span>
                                            {cut.image_path && (
                                                <span className="text-[10px] text-purple-400 flex items-center gap-1 font-bold">
                                                    <Wand2 size={10} /> {t('aiReady')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Director Mode Area */}
                    {isDirectorMode ? (
                        <div className="border border-purple-500/30 bg-[#13131c] p-4 rounded-xl shadow-2xl relative z-20 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-purple-400 font-bold text-sm flex items-center gap-2">
                                    <Wand2 size={14} /> {t('directorMode.title')}
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsDirectorMode(false);
                                        setDirectorOptions([]);
                                        setScriptInput('');
                                    }}
                                    className="h-6 text-xs text-slate-500 hover:text-white"
                                >
                                    {t('directorMode.cancel')}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <Textarea
                                    placeholder={t('directorMode.placeholder')}
                                    value={scriptInput}
                                    onChange={(e) => setScriptInput(e.target.value)}
                                    className="bg-[#0f0f16] border-slate-700 min-h-[80px] text-sm text-slate-200 focus:border-purple-500"
                                />
                                {!directorOptions.length && (
                                    <Button
                                        onClick={handleDirectorSuggest}
                                        disabled={isSuggesting || !scriptInput.trim()}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-9 text-xs shadow-lg shadow-purple-900/20"
                                    >
                                        {isSuggesting ? (
                                            <><Loader2 size={14} className="mr-2 animate-spin" /> {t('directorMode.analysing')}</>
                                        ) : (
                                            t('directorMode.getSuggestions')
                                        )}
                                    </Button>
                                )}
                            </div>

                            {/* Options Display */}
                            {directorOptions.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    {directorOptions.map((opt) => (
                                        <div
                                            key={opt.id}
                                            className={`border border-slate-700 rounded-lg p-3 bg-[#0f0f16] cursor-pointer hover:border-purple-500 transition-all hover:scale-[1.02] active:scale-[0.98] ${isRendering === opt.id ? 'ring-1 ring-purple-500 opacity-50 pointer-events-none' : ''}`}
                                            onClick={() => handleOptionSelect(opt)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="font-bold text-xs text-slate-200">{opt.label}</span>
                                                <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 bg-slate-800 rounded">{opt.aspect_ratio}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed border-t border-slate-800 pt-2">{opt.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        cuts.length > 0 && (
                            <button
                                onClick={() => setIsDirectorMode(true)}
                                className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-white hover:border-slate-600 hover:bg-slate-900/30 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            >
                                <Plus size={16} /> {t('directorMode.addNext')}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Mobile Viewer */}
            {/* Mobile Viewer */}
            <MobileEpisodeViewer
                isOpen={isReviewMode}
                onClose={() => setReviewMode(false)}
                title="Episode Preview"
                episodeId={activeEpisodeId || ''}
                cuts={cuts}
                onUpdateCut={(cutId, newPath) => {
                    setCuts(prev => prev.map(c => c.id === cutId ? { ...c, image_path: newPath } : c));
                }}
                mode={isReviewMode ? 'review' : 'view'}
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #334155;
                  border-radius: 3px;
                }
            `}</style>
        </div>
    );
}
