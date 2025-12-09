'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Image as ImageIcon, MessageSquare, Trash2, Clapperboard, Loader2, Wand2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import DirectorCutModal from './DirectorCutModal';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface StoryCut {
    id: string;
    cut_order: number;
    script: string;
    aspect_ratio: string;
    image_path?: string;
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
    onEditCut: () => void;
}

export default function StoryboardView({ projectId, onEditCut }: StoryboardViewProps) {
    const { activeEpisodeId, setActiveCut } = useCanvasStore();
    const [cuts, setCuts] = useState<StoryCut[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Director Mode State
    const [isDirectorMode, setIsDirectorMode] = useState(false);
    const [scriptInput, setScriptInput] = useState('');
    const [directorOptions, setDirectorOptions] = useState<DirectorOption[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isRendering, setIsRendering] = useState<string | null>(null); // storing option ID being rendered
    const [modifyingCut, setModifyingCut] = useState<StoryCut | null>(null); // For Director's Cut modal

    const fetchCuts = async () => {
        if (!activeEpisodeId) return;
        try {
            setLoading(true);
            const res = await api.get(`/cuts/?episode_id=${activeEpisodeId}`);
            setCuts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
                title: "Suggestion Failed",
                description: "Failed to get suggestions from Director AI.",
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
            await api.post('/cuts/', {
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
                title: "Creation Failed",
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
                title: "Scene Deleted",
                description: "The scene has been removed.",
            });
        } catch (err) {
            console.error("Failed to delete cut", err);
            toast({
                title: "Deletion Failed",
                description: "Failed to delete scene.",
                variant: 'destructive',
            });
        }
    };

    // New function to handle generation for existing cuts (bulk created)
    const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

    const handleGenerateImage = async (cutId: string) => {
        try {
            setGeneratingIds(prev => new Set(prev).add(cutId));
            await api.post(`/episodes/${activeEpisodeId}/cuts/${cutId}/generate-image`);
            toast({
                title: "Generation Started",
                description: "AI is generating the image. This may take a moment.",
            });
            // Poll for update or just let user refresh?
            // Simple poll for this specific cut
            const poll = setInterval(async () => {
                const res = await api.get(`/cuts/${cutId}`);
                // Assuming GET /cuts/{id} exists, if not we fall back to refreshing list
                // Since fetching single cut might not be exposed, let's just refresh the whole list after delay
                fetchCuts();
            }, 3000);

            // Stop polling after 30s
            setTimeout(() => {
                clearInterval(poll);
                setGeneratingIds(prev => {
                    const next = new Set(prev);
                    next.delete(cutId);
                    return next;
                });
            }, 30000);

        } catch (e) {
            console.error("Gen Image Failed", e);
            toast({ title: "Generation Failed", variant: "destructive" });
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(cutId);
                return next;
            });
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
            <div className="h-full flex items-center justify-center text-gray-500">
                Select an episode to view storyboard.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 shrink-0">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <Clapperboard size={18} className="text-purple-400" />
                    Storyboard
                </h2>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Director Mode Input Section - Always visible at bottom or top? Let's put it at the top for "What's Next?" flow or bottom for "Append"? 
                    Let's use the 'Add Cut' area at the bottom.
                */}

                {/* Existing Cuts List */}
                <div className="space-y-8 pb-32"> {/* Padding for fixed bottom bar if needed, or just spacing */}
                    {loading ? (
                        <div className="text-gray-500 text-center py-10">Loading cuts...</div>
                    ) : cuts.length === 0 && !isDirectorMode ? (
                        <div className="text-center py-10">
                            <div className="text-gray-500 italic mb-4">No cuts yet.</div>
                            <Button
                                onClick={() => setIsDirectorMode(true)}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Wand2 size={16} className="mr-2" /> Start Director Mode
                            </Button>
                        </div>
                    ) : (
                        cuts.map((cut) => (
                            <div key={cut.id} className="flex gap-4 items-start group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="w-8 pt-2 text-center text-gray-500 font-mono text-xs">
                                    #{cut.cut_order}
                                </div>

                                <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-colors shadow-lg">
                                    {/* Header / Script Preview */}
                                    <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex justify-between items-start">
                                        <p className="text-sm text-gray-300 italic">"{cut.script}"</p>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-gray-400 hover:text-purple-400 hover:bg-gray-700"
                                                title="Director's Cut (Refine)"
                                                onClick={() => setModifyingCut(cut)}
                                            >
                                                <Sparkles size={14} />
                                            </Button>
                                            <ConfirmationDialog
                                                open={deleteConfirmationId === cut.id}
                                                onOpenChange={(open) => !open && setDeleteConfirmationId(null)}
                                                title="Delete Scene?"
                                                description="Are you sure you want to delete this scene?"
                                                onConfirm={() => handleDeleteConfirm(cut.id)}
                                                variant="destructive"
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-gray-400 hover:text-red-400"
                                                        onClick={() => setDeleteConfirmationId(cut.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Visual Preview area */}
                                    <div className="bg-black flex items-center justify-center relative group-hover:bg-gray-900 overflow-hidden">
                                        {cut.image_path ? (
                                            <img src={cut.image_path} alt="Cut" className="max-w-full max-h-[400px] object-contain" />
                                        ) : (
                                            <div className="text-center p-8">
                                                {generatingIds.has(cut.id) ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Loader2 className="animate-spin text-purple-500" />
                                                        <p className="text-xs text-purple-500">Generating...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <ImageIcon size={32} className="mx-auto text-gray-600 mb-2" />
                                                        <p className="text-xs text-gray-500 mb-2">No image generated</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleGenerateImage(cut.id)}
                                                            className="h-7 text-xs"
                                                        >
                                                            <Wand2 size={12} className="mr-1" /> Generate
                                                        </Button>
                                                    </>
                                                )}
                                            </div>

                                        )}

                                        {/* Edit Button Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setActiveCut(cut.id);
                                                    onEditCut();
                                                }}
                                            >
                                                Edit in Canvas
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Director Mode Area - Appears at the end of the list */}
                {isDirectorMode ? (
                    <div className="border-t border-gray-700 bg-gray-800/90 p-4 rounded-xl border border-purple-500/30 shadow-2xl">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-purple-400 font-semibold flex items-center gap-2">
                                <Wand2 size={16} /> Director AI
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsDirectorMode(false);
                                    setDirectorOptions([]);
                                    setScriptInput('');
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 space-y-3">
                                <Textarea
                                    placeholder="Describe the next scene (e.g., 'The hero looks up at the rainy sky, tears mixing with rain.')"
                                    value={scriptInput}
                                    onChange={(e) => setScriptInput(e.target.value)}
                                    className="bg-gray-900 border-gray-700 min-h-[80px]"
                                />
                                {!directorOptions.length && (
                                    <Button
                                        onClick={handleDirectorSuggest}
                                        disabled={isSuggesting || !scriptInput.trim()}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isSuggesting ? (
                                            <><Loader2 size={16} className="mr-2 animate-spin" /> Directing...</>
                                        ) : (
                                            "Get Suggestions"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Options Display */}
                        {directorOptions.length > 0 && (
                            <div className="mt-6 grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                {directorOptions.map((opt) => (
                                    <div
                                        key={opt.id}
                                        className={`border border-gray-700 rounded-lg p-3 bg-gray-900 cursor-pointer hover:border-purple-500 transition-all hover:scale-105 active:scale-95 ${isRendering === opt.id ? 'ring-2 ring-purple-500 opacity-50 pointer-events-none' : ''}`}
                                        onClick={() => handleOptionSelect(opt)}
                                    >
                                        <div className="aspect-[4/3] bg-gray-800 rounded mb-2 flex items-center justify-center text-gray-500 text-xs text-center p-2 relative overflow-hidden">
                                            {/* Placeholder for the 'visual direction' thumbnail if we had one, for now text or icon */}
                                            {isRendering === opt.id ? (
                                                <Loader2 className="animate-spin text-purple-500" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <Clapperboard size={20} className="mb-1 opacity-50" />
                                                    <span className="font-bold text-gray-400">{opt.label}</span>
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-200 mb-1">{opt.label}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-3">{opt.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    cuts.length > 0 && (
                        <Button
                            onClick={() => setIsDirectorMode(true)}
                            className="w-full py-6 border-2 border-dashed border-gray-700 bg-gray-800/30 hover:bg-gray-800 hover:border-gray-500 text-gray-400"
                        >
                            <Plus size={20} className="mr-2" /> Add Next Scene
                        </Button>
                    )
                )}
            </div>
        </div>
    );
}
