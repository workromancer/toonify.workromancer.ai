'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';

export default function InspectorPanel() {
    const { selectedId, elements, updateSelectedElement, activeCharacter, activeCutId, activeEpisodeId } = useCanvasStore(); // Added activeEpisodeId
    const selectedElement = elements.find(el => el.id === selectedId);
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!selectedElement) return;

        try {
            setGenerating(true);
            let imageUrl = "";

            if (activeEpisodeId && activeCutId) {
                // Use Cut-specific generation
                const res = await api.post(`/episodes/${activeEpisodeId}/cuts/${activeCutId}/generate-image`, {
                    prompt_override: prompt || undefined
                });
                // Res.data is the Cut object, which should have image_path
                imageUrl = res.data.image_path;
            } else {
                // Fallback / Standalone generation
                const res = await api.post('/ai/generate', {
                    prompt,
                    width: selectedElement.width,
                    height: selectedElement.height,
                    style_preset: "anime_webtoon"
                });
                imageUrl = res.data.image_url;
            }

            if (imageUrl) {
                updateSelectedElement({ content: imageUrl, prompt });
            }

        } catch (err) {
            console.error("Generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    // Load active cut script if needed (future feature)
    // useEffect(() => { ... }, [activeCutId]);

    const insertCharacterPrompt = () => {
        if (activeCharacter) {
            setPrompt((prev) => {
                const charPrompt = `(Character: ${activeCharacter.name}, ${activeCharacter.tags.join(', ')})`;
                return prev ? `${prev}, ${charPrompt}` : charPrompt;
            });
        }
    };

    if (!selectedElement) {
        return (
            <div className="p-4 space-y-6 h-full bg-[#0f0f16] border-l border-slate-800">
                <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-4">Properties</h3>
                {activeCharacter ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-700 shrink-0">
                                {activeCharacter.profile_image_url ? (
                                    <img src={activeCharacter.profile_image_url} alt={activeCharacter.name} className="w-full h-full object-cover" />
                                ) : activeCharacter.name ? (
                                    <span className="text-2xl font-bold text-slate-600">
                                        {activeCharacter.name[0]}
                                    </span>
                                ) : null}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white">{activeCharacter.name}</h4>
                                <p className="text-sm text-slate-500">{activeCharacter.tags.join(', ')}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-lg text-center">
                        Select an element or character to view properties.
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 h-full bg-[#0f0f16] border-l border-slate-800">
            <div>
                <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-4">Properties</h3>
                <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="width" className="text-slate-400 text-xs">Width</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="width"
                                value={selectedElement.width}
                                disabled
                                className="bg-[#15151A] border-slate-700 text-slate-300 focus-visible:ring-purple-600 h-8"
                            />
                            <span className="text-slate-500 text-xs">px</span>
                        </div>
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="height" className="text-slate-400 text-xs">Height</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="height"
                                value={selectedElement.height}
                                disabled
                                className="bg-[#15151A] border-slate-700 text-slate-300 focus-visible:ring-purple-600 h-8"
                            />
                            <span className="text-slate-500 text-xs">px</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
                <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-4">AI Generation</h3>
                <div className="space-y-4">
                    <div className="grid w-full items-center gap-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="prompt" className="text-slate-400 text-xs">Prompt</Label>
                            {activeCharacter && (
                                <Button variant="link" size="sm" className="h-auto p-0 text-purple-400 text-xs hover:text-purple-300" onClick={insertCharacterPrompt}>
                                    + {activeCharacter.name}
                                </Button>
                            )}
                        </div>
                        <Input
                            id="prompt"
                            data-testid="ai-prompt-input"
                            placeholder="Describe the scene..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="bg-[#15151A] border-slate-700 text-slate-300 focus-visible:ring-purple-600 focus-visible:border-purple-600"
                        />
                    </div>

                    <Button
                        data-testid="ai-generate-button"
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                        onClick={handleGenerate}
                        disabled={generating || (!prompt && !activeCutId)}
                    >
                        {generating ? (
                            'Generating...'
                        ) : (
                            <>
                                <Wand2 className="mr-2" size={14} /> Generate Image
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
