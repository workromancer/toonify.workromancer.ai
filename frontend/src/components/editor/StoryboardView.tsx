'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Image as ImageIcon, MessageSquare } from 'lucide-react';

interface StoryCut {
    id: string;
    cut_order: number;
    script: string;
    aspect_ratio: string;
    image_path?: string;
}

export default function StoryboardView() {
    const { activeEpisodeId } = useCanvasStore();
    const [cuts, setCuts] = useState<StoryCut[]>([]);
    const [loading, setLoading] = useState(false);

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

    const createCut = async () => {
        if (!activeEpisodeId) return;
        try {
            const nextOrder = cuts.length > 0 ? cuts[cuts.length - 1].cut_order + 1 : 1;
            await api.post('/cuts/', {
                episode_id: activeEpisodeId,
                cut_order: nextOrder,
                script: `Scene ${nextOrder}`,
                selected_layout: 'single'
            });
            fetchCuts();
        } catch (err) {
            console.error(err);
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
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                <h2 className="font-semibold text-white">Storyboard</h2>
                <Button size="sm" onClick={createCut} className="bg-purple-600 hover:bg-purple-700">
                    <Plus size={16} className="mr-2" /> Add Cut
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {loading ? (
                    <div className="text-gray-500 text-center">Loading cuts...</div>
                ) : cuts.length === 0 ? (
                    <div className="text-gray-500 text-center italic mt-10">No cuts yet. Start adding scenes!</div>
                ) : (
                    cuts.map((cut) => (
                        <div key={cut.id} className="flex gap-4 items-start group">
                            <div className="w-12 pt-2 text-center text-gray-500 font-mono text-sm">
                                #{cut.cut_order}
                            </div>

                            <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-colors">
                                {/* Header / Script Preview */}
                                <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex justify-between">
                                    <span className="text-sm font-medium text-gray-300 truncate">{cut.script}</span>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white">
                                            <MessageSquare size={14} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Visual Preview area */}
                                <div className="aspect-[3/2] bg-gray-900 flex items-center justify-center relative group-hover:bg-gray-900/80 transition-colors">
                                    {cut.image_path ? (
                                        <img src={cut.image_path} alt="Cut" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <ImageIcon size={32} className="mx-auto text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-500">No image generated</p>
                                        </div>
                                    )}

                                    {/* Edit Button Overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Button variant="secondary" size="sm">
                                            Edit in Canvas
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
