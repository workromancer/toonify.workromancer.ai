import { X, Smartphone, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';

interface StoryCut {
    id: string;
    cut_order: number;
    script: string;
    image_path?: string;
    dialogues: any[];
}

mode ?: 'view' | 'review';
}

export default function MobileEpisodeViewer({ isOpen, onClose, title, episodeId, cuts, onUpdateCut, mode = 'view' }: MobileEpisodeViewerProps) {
    if (!isOpen) return null;

    // Sort cuts by order
    const sortedCuts = [...cuts].sort((a, b) => a.cut_order - b.cut_order);

    const [generatingCuts, setGeneratingCuts] = useState<Record<string, boolean>>({});
    const [reviewStatus, setReviewStatus] = useState<Record<string, 'approved' | 'rejected' | null>>({});

    const handleGenerateImage = async (cutId: string) => {
        setGeneratingCuts(prev => ({ ...prev, [cutId]: true }));
        try {
            const res = await api.post(`/episodes/${episodeId}/cuts/${cutId}/generate-image`);
            if (res.data && onUpdateCut) {
                onUpdateCut(cutId, res.data.image_path);
            }
        } catch (e) {
            console.error("Failed to generate image", e);
        } finally {
            setGeneratingCuts(prev => ({ ...prev, [cutId]: false }));
        }
    };

    const toggleReviewStatus = (cutId: string, status: 'approved' | 'rejected') => {
        setReviewStatus(prev => ({
            ...prev,
            [cutId]: prev[cutId] === status ? null : status
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-[400px] h-[85vh] bg-black rounded-[3rem] border-8 border-gray-800 shadow-2xl flex flex-col overflow-hidden">

                {/* Status Bar Mockup */}
                <div className="h-8 bg-black flex items-center justify-between px-6 text-white text-xs select-none z-10">
                    <span>9:41</span>
                    <div className="flex gap-1.5">
                        <div className="w-4 h-2.5 bg-white rounded-[1px]" />
                        <div className="w-3 h-2.5 bg-white rounded-[1px]" />
                        <div className="w-5 h-2.5 border border-white rounded-[2px] relative" />
                    </div>
                </div>

                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-2xl z-20 pointer-events-none" />

                {/* App Header */}
                <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-[#1a1a1a] z-10">
                    <span className="font-bold text-white truncate max-w-[200px]">{title}</span>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white hover:bg-white/10 rounded-full">
                        <X size={18} />
                    </Button>
                </div>

                {/* Webtoon Content - Vertical Scroll */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
                    <div className="flex flex-col">
                        {/* Title Card */}
                        <div className="aspect-[3/4] flex items-center justify-center bg-gray-100 p-8 text-center">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 mb-2">{title}</h1>
                                <p className="text-sm text-gray-500">Original Webtoon</p>
                            </div>
                        </div>

                        {sortedCuts.map((cut) => (
                            <div key={cut.id} className="relative w-full">
                                {cut.image_path ? (
                                    <img
                                        src={cut.image_path}
                                        alt={`Cut ${cut.cut_order}`}
                                        className="w-full h-auto block" // Display block removes bottom gap
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full aspect-square bg-gray-200 flex flex-col items-center justify-center p-4 text-center group">
                                        <p className="font-bold text-gray-400 text-lg">Cut #{cut.cut_order}</p>
                                        <p className="text-xs text-gray-500 mt-2 max-w-[80%]">{cut.script}</p>

                                        <Button
                                            size="sm"
                                            className="mt-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleGenerateImage(cut.id);
                                            }}
                                            disabled={generatingCuts[cut.id]}
                                        >
                                            {generatingCuts[cut.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                            Generate Image
                                        </Button>
                                    </div>
                                )}

                                {/* Dialogues Overlay (Optional - usually baked in but for MVP we might overlay text bubbles check) */}
                                {cut.image_path && (
                                    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-end pb-8">
                                        {/* Simple overlay for debug or if we aren't burning text. 
                                             Real webtoon has text burned in image usually. 
                                             For now let's assume image has text or valid enough.
                                         */}
                                    </div>
                                )}

                                {mode === 'review' && (
                                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                                        <Button
                                            size="icon"
                                            className={cn(
                                                "h-8 w-8 rounded-full shadow-lg transition-all",
                                                reviewStatus[cut.id] === 'approved'
                                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                                    : "bg-white/80 hover:bg-white text-gray-400"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleReviewStatus(cut.id, 'approved');
                                            }}
                                        >
                                            <Check size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className={cn(
                                                "h-8 w-8 rounded-full shadow-lg transition-all",
                                                reviewStatus[cut.id] === 'rejected'
                                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                                    : "bg-white/80 hover:bg-white text-gray-400"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleReviewStatus(cut.id, 'rejected');
                                            }}
                                        >
                                            <XCircle size={16} />
                                        </Button>
                                    </div>
                                )}

                                {mode === 'review' && reviewStatus[cut.id] === 'rejected' && (
                                    <div className="absolute inset-0 bg-red-500/20 pointer-events-none border-2 border-red-500" />
                                )}
                            </div>
                        ))}

                        {/* Footer / End Card */}
                        <div className="py-20 bg-gray-50 text-center space-y-4">
                            <p className="text-gray-400 font-medium">To Be Continued</p>
                            <div className="flex justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/50 rounded-full pointer-events-none" />
            </div>

            {/* Close Button Outside (Desktop convenience) */}
            <Button
                className="absolute top-4 right-4 rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md md:flex hidden items-center justify-center"
                onClick={onClose}
            >
                <X size={24} />
            </Button>
        </div>
    );
}
