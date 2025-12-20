'use client';

import { useState, useEffect } from 'react';

import { Wand2, Smartphone, Square, Monitor, Check, RectangleHorizontal, RectangleVertical } from 'lucide-react';
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
    <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
        {[
            { id: '9:16', icon: Smartphone, label: '9:16' },
            { id: '2:3', icon: RectangleVertical, label: '2:3' },
            { id: '3:4', icon: RectangleVertical, label: '3:4' },
            { id: '4:5', icon: RectangleVertical, label: '4:5' },
            { id: '1:1', icon: Square, label: '1:1' },
            { id: '5:4', icon: RectangleHorizontal, label: '5:4' },
            { id: '4:3', icon: RectangleHorizontal, label: '4:3' },
            { id: '3:2', icon: RectangleHorizontal, label: '3:2' },
            { id: '16:9', icon: Monitor, label: '16:9' },
            { id: '21:9', icon: Monitor, label: '21:9' },
        ].map((ratio) => (
            <button
                key={ratio.id}
                onClick={() => onChange(ratio.id)}
                className={`flex flex-col items-center justify-center py-2 rounded-md text-[9px] transition-all gap-1 ${current === ratio.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                title={ratio.label}
            >
                <ratio.icon size={12} />
                {ratio.label}
            </button>
        ))}
    </div>
);


export default function InspectorPanel() {
    const { activeCutId, activeEpisodeId, updateCut, generatingIdsSet, addGeneratingId, removeGeneratingId } = useCanvasStore();
    // const selectedElement = elements.find(el => el.id === selectedId); // Removed
    const params = useParams();
    const projectId = params?.projectId as string;
    const t = useTranslations('Project.Editor.inspectorPanel');

    const [prompt, setPrompt] = useState('');
    // const [generating, setGenerating] = useState(false); // Removed local state
    const generating = activeCutId ? generatingIdsSet.has(activeCutId) : false;

    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [appearingCharIds, setAppearingCharIds] = useState<Set<string>>(new Set());
    const [usePreviousContext, setUsePreviousContext] = useState(true);

    const [hasImage, setHasImage] = useState(false);

    // Sync specific to activeCut
    useEffect(() => {
        const fetchCutDetails = async () => {
            if (!activeCutId) return;
            try {
                const res = await api.get(`/cuts/${activeCutId}`);
                const cut = res.data;
                setPrompt(cut.script || '');
                setAspectRatio(cut.aspect_ratio || '1:1');
                setHasImage(!!(cut.image_path || cut.image_url));

                // robust handling for both old (string[]) and new ({id, name}[]) formats
                const ids = new Set<string>();
                if (Array.isArray(cut.appearing_characters)) {
                    cut.appearing_characters.forEach((c: any) => {
                        if (typeof c === 'string') {
                            // legacy migration: try to find char by name
                            const found = characters.find(ch => ch.name === c);
                            if (found) ids.add(found.id);
                        } else if (c && c.id) {
                            ids.add(c.id);
                        }
                    });
                }
                setAppearingCharIds(ids);
            } catch (err) {
                console.error("Failed to fetch cut details", err);
            }
        };

        fetchCutDetails();
    }, [activeCutId, characters]); // added characters dependency for legacy mapping

    // Fetch characters
    useEffect(() => {
        const fetchChars = async () => {
            if (!projectId) return;
            try {
                const res = await api.get('/characters', { params: { project_id: projectId } });
                setCharacters(res.data);
            } catch (err) {
                console.error("Failed to fetch characters", err);
            }
        };
        fetchChars();
    }, [projectId]);

    const handlePromptChange = (val: string) => {
        setPrompt(val);
        if (activeCutId) {
            updateCut({ script: val });
        }
    };

    const handleRatioChange = (ratio: string) => {
        setAspectRatio(ratio);
        if (activeCutId) {
            updateCut({ aspect_ratio: ratio });
        }
    };

    const toggleCharById = (charId: string) => {
        setAppearingCharIds(prev => {
            const next = new Set(prev);
            if (next.has(charId)) next.delete(charId);
            else next.add(charId);

            // Sync with backend
            if (activeCutId) {
                // Reconstruct {id, name} objects
                const minimalChars = Array.from(next).map(id => {
                    const char = characters.find(c => c.id === id);
                    return { id, name: char?.name || 'Unknown' };
                });
                updateCut({ appearing_characters: minimalChars });
            }
            return next;
        });
    };

    const handleGenerate = async () => {
        if (!activeEpisodeId || !activeCutId) return;
        try {
            addGeneratingId(activeCutId);
            await api.post(`/episodes/${activeEpisodeId}/cuts/${activeCutId}/generate-image`, {
                prompt_override: prompt || undefined,
                use_previous_context: usePreviousContext
            });
            // StoryboardView poller will handle success and removal of ID

        } catch (err) {
            console.error("Generation failed", err);
            removeGeneratingId(activeCutId);
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
                        <span className="text-[10px] text-slate-500">{appearingCharIds.size}/{characters.length}</span>
                    </label>
                    <div className="space-y-2">
                        {characters.map(char => (
                            <div
                                key={char.id}
                                onClick={() => toggleCharById(char.id)}
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
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${appearingCharIds.has(char.id) ? 'bg-purple-600 border-purple-500' : 'border-slate-600'}`}>
                                    {appearingCharIds.has(char.id) && <Check size={10} className="text-white" />}
                                </div>
                            </div>
                        ))}
                        {characters.length === 0 && <div className="text-xs text-slate-600 italic">{t('noCharacters')}</div>}
                    </div>
                </div>

            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0f0f16]">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <input
                        type="checkbox"
                        id="usePreviousContext"
                        checked={usePreviousContext}
                        onChange={(e) => setUsePreviousContext(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 accent-purple-600 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="usePreviousContext" className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-300 transition-colors">
                        {t('referencePreviousCut')}
                    </label>
                </div>
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
                            <Wand2 size={16} fill="currentColor" /> {hasImage ? t('regenerateImage') : t('generateImage')}
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
