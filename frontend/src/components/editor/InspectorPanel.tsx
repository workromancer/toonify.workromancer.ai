'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';

export default function InspectorPanel() {
    const { selectedId, elements, updateSelectedElement, activeCharacter } = useCanvasStore();
    const selectedElement = elements.find(el => el.id === selectedId);
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!selectedElement || !prompt) return;

        try {
            setGenerating(true);
            const res = await api.post('/ai/generate', {
                prompt,
                width: selectedElement.width,
                height: selectedElement.height,
                style_preset: "anime_webtoon"
            });

            updateSelectedElement({ content: res.data.image_url, prompt });
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

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
            <div className="p-4 space-y-6">
                <h3 className="font-semibold mb-4 text-gray-300">Properties</h3>
                <div className="text-sm text-gray-500 italic">
                    Select an element to view properties.
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div>
                <h3 className="font-semibold mb-4 text-gray-300">Properties</h3>
                <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="width">Width</Label>
                        <div className="flex gap-2">
                            <Input
                                id="width"
                                value={selectedElement.width}
                                disabled
                                className="bg-gray-800"
                            />
                            <span className="text-gray-500 py-2">px</span>
                        </div>
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="height">Height</Label>
                        <div className="flex gap-2">
                            <Input
                                id="height"
                                value={selectedElement.height}
                                disabled
                                className="bg-gray-800"
                            />
                            <span className="text-gray-500 py-2">px</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
                <h3 className="font-semibold mb-4 text-gray-300">AI Generation</h3>
                <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="prompt">Prompt</Label>
                            {activeCharacter && (
                                <Button variant="link" size="sm" className="h-auto p-0 text-purple-400" onClick={insertCharacterPrompt}>
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
                        />
                    </div>

                    <Button
                        data-testid="ai-generate-button"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                        onClick={handleGenerate}
                        disabled={generating || !prompt}
                    >
                        {generating ? (
                            'Generating...'
                        ) : (
                            <>
                                <Wand2 className="mr-2" size={16} /> Generate Image
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
