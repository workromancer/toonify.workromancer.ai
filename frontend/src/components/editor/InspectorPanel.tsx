'use client';

import { useState, useEffect } from 'react';

import { Wand2, Smartphone, Square, Monitor, Check } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Character {
    id: string;
    name: string;
    profile_image_url?: string;
    tags: string[];
}

const AspectRatioSelector = ({ current, onChange }: { current: string, onChange: (r: string) => void }) => (
    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
        {[
            { id: '9:16', icon: Smartphone, label: 'Scroll' },
            { id: '1:1', icon: Square, label: 'Square' },
            { id: '16:9', icon: Monitor, label: 'Wide' },
        ].map((ratio) => (
            <button
                key={ratio.id}
                onClick={() => onChange(ratio.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md text-[10px] transition-all gap-1 ${current === ratio.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
            >
                <ratio.icon size={14} />
                {ratio.label}
            </button>
        ))}
    </div>
);


export default function InspectorPanel() {
    const { activeCutId, activeEpisodeId, updateCut } = useCanvasStore();
    // const selectedElement = elements.find(el => el.id === selectedId); // Removed
    const params = useParams();
    const projectId = params?.projectId as string;
    const t = useTranslations('Project.Editor.inspectorPanel');

    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [activeCharIds, setActiveCharIds] = useState<Set<string>>(new Set());

    // Sync specific to activeCut if needed, but currently Inspector seems to rely on local state or parent selection
    // Ideally we should listen to activeCut changes to populate prompt/ratio
    // For now, let's just clear prompt when activeCut changes to simulate strict context
    useEffect(() => {
        setPrompt('');
        // TODO: specific fetch for cut details if not already in store?
        // Assuming StoryboardView handles the "state" of the cut, but Inspector needs to know it.
        // Since we don't have cuts in global store (only in StoryboardView local state), 
        // effectively Inspector might need to fetch the cut or we need to move cuts to store.
        // For this refactor, I will keep it simple.
    }, [activeCutId]);

    // Fetch characters
    useEffect(() => {
        const fetchChars = async () => {
            if (!projectId) return;
            try {
                const res = await api.get('/characters', { params: { project_id: projectId } });
                setCharacters(res.data);
                // Default all to inactive or active? active for now
                if (res.data.length > 0) setActiveCharIds(new Set([res.data[0].id]));
            } catch (err) {
                console.error("Failed to fetch characters", err);
            }
        };
        fetchChars();
    }, [projectId]);

    const handlePromptChange = (val: string) => {
        setPrompt(val);
        if (activeCutId) {
            updateCut({ prompt: val });
        }
    };

    const handleRatioChange = (ratio: string) => {
        setAspectRatio(ratio);
        if (activeCutId) {
            updateCut({ aspect_ratio: ratio });
        }
    };

    const toggleCharActive = (id: string) => {
        setActiveCharIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            let imageUrl = "";

            // Construct prompt with active characters
            let finalPrompt = prompt;
            const activeChars = characters.filter(c => activeCharIds.has(c.id));
            if (activeChars.length > 0) {
                const charDescriptions = activeChars.map(c => `(${c.name}: ${c.tags.slice(0, 3).join(', ')})`).join(', ');
                finalPrompt = `${finalPrompt}, Characters: [${charDescriptions}]`;
            }

            if (activeEpisodeId && activeCutId) {
                // Use Cut-specific generation
                const res = await api.post(`/episodes/${activeEpisodeId}/cuts/${activeCutId}/generate-image`, {
                    prompt_override: finalPrompt || undefined
                });
                imageUrl = res.data.image_path;

                // We should update the cut in state/UI - since we lack a global cuts store, we rely on refetch in StoryboardView :(
                // Ideally this flow should be cleaner.
                // But for now removal of Canvas is priority.
                if (imageUrl) {
                    updateCut({ image_path: imageUrl });
                }
            }

        } catch (err) {
            console.error("Generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    if (!activeCutId) {
        return (
            <div className="p-4 h-full bg-[#0f0f16] border-l border-slate-800 flex items-center justify-center text-slate-500 text-xs italic">
                {t('empty')}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0f0f16] border-l border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white mb-1">{t('title')}</h2>
                <p className="text-xs text-slate-500">
                    {t('selected', { id: String(activeCutId ?? '?').slice(0, 8) })}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                {/* Prompt Section */}
                <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 flex justify-between">
                        <span>{t('imagePrompt')}</span>
                        <span className="text-purple-400 cursor-pointer hover:underline">{t('autoEnhance')}</span>
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        placeholder={t('promptPlaceholder')}
                        className="w-full h-32 bg-[#15151a] border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none leading-relaxed placeholder:text-slate-600"
                    />
                </div>

                {/* Aspect Ratio */}
                <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">{t('aspectRatio')}</label>
                    <AspectRatioSelector
                        current={aspectRatio}
                        onChange={handleRatioChange}
                    />
                </div>

                {/* Character Casting */}
                <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 flex justify-between items-center">
                        <span>{t('activeCharacters')}</span>
                        <span className="text-[10px] text-slate-500">{activeCharIds.size}/{characters.length}</span>
                    </label>
                    <div className="space-y-2">
                        {characters.map(char => (
                            <div
                                key={char.id}
                                onClick={() => toggleCharActive(char.id)}
                                className="flex items-center justify-between p-2 bg-[#13131c] border border-slate-800 rounded-lg hover:border-slate-600 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                        {char.profile_image_url ? (
                                            <img src={char.profile_image_url} alt={char.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">{char.name[0]}</div>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-slate-300">{char.name}</span>
                                </div>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${activeCharIds.has(char.id) ? 'bg-purple-600 border-purple-500' : 'border-slate-600'}`}>
                                    {activeCharIds.has(char.id) && <Check size={10} className="text-white" />}
                                </div>
                            </div>
                        ))}
                        {characters.length === 0 && <div className="text-xs text-slate-600 italic">{t('noCharacters')}</div>}
                    </div>
                </div>

            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0f0f16]">
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className={`
           w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg
           ${generating
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30'
                        }
         `}
                >
                    {generating ? (
                        <>{t('processing')}</>
                    ) : (
                        <>
                            <Wand2 size={16} fill="currentColor" /> {t('generateImage')}
                        </>
                    )}
                </button>
                <p className="text-[10px] text-slate-600 text-center mt-2">
                    {t('cost')}
                </p>
            </div>
        </div>
    );
}
