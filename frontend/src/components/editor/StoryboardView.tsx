import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Lock, Unlock } from 'lucide-react';

// ... (imports)

export default function StoryboardView({ onEditCut }: StoryboardViewProps) {
    const { activeEpisodeId, setActiveCut } = useCanvasStore();
    const [cuts, setCuts] = useState<StoryCut[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Director Mode State
    const [scriptInput, setScriptInput] = useState('');
    const [isDirecting, setIsDirecting] = useState(false);
    const [directorOptions, setDirectorOptions] = useState<DirectionOption[]>([]);
    const [isRendering, setIsRendering] = useState(false);
    
    // Seed Locking
    const [lockedSeed, setLockedSeed] = useState<number | null>(null);
    const [isSeedLocked, setIsSeedLocked] = useState(false);

    // ... (fetchCuts, handleDirect)

    const handleSelectOption = async (option: DirectionOption) => {
        if (!activeEpisodeId) return;
        setIsRendering(true);
        try {
            // Use locked seed if enabled, otherwise undefined (backend generates random)
            const seedToUse = isSeedLocked && lockedSeed !== null ? lockedSeed : undefined;

            // 1. Render Image
            const renderRes = await api.post('/scenes/render', {
                prompt: option.image_prompt,
                width: 1024,
                height: 1024,
                seed: seedToUse
            });
            const imageUrl = renderRes.data.image_url;
            const usedSeed = renderRes.data.seed;

            // If we didn't have a locked seed but want to lock it for future, we could.
            // But for now, let's just update the lockedSeed if it was null and locking is enabled (auto-lock first seed?)
            // Or just let user manually set it. 
            // Better UX: If locking is ON and no seed set, set it to the one just used.
            if (isSeedLocked && lockedSeed === null) {
                setLockedSeed(usedSeed);
            }

            // 2. Create Cut
            const nextOrder = cuts.length > 0 ? cuts[cuts.length - 1].cut_order + 1 : 1;
            await api.post('/cuts/', {
                episode_id: activeEpisodeId,
                cut_order: nextOrder,
                script: scriptInput, 
                selected_layout: 'single',
                aspect_ratio: option.aspect_ratio,
                image_path: imageUrl 
            });

            // 3. Reset and Refresh
            setScriptInput('');
            setDirectorOptions([]);
            fetchCuts();

        } catch (err) {
            console.error("Rendering Failed", err);
            alert("Failed to render scene.");
        } finally {
            setIsRendering(false);
        }
    };

    // ... (deleteCut, openDirectorCut, useEffect)

    // ... (render)

            {/* Director Mode Input Area (Fixed at Bottom) */}
            <div className="border-t border-gray-700 bg-gray-800 p-4 shadow-lg z-10">
                {/* Seed Control */}
                <div className="flex items-center justify-end gap-2 mb-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <Switch 
                            id="seed-lock" 
                            checked={isSeedLocked}
                            onCheckedChange={(checked) => {
                                setIsSeedLocked(checked);
                                if (!checked) setLockedSeed(null); // Reset when unlocking? Or keep? Let's reset for now or keep logic simple.
                            }}
                        />
                        <Label htmlFor="seed-lock" className="cursor-pointer flex items-center gap-1">
                            {isSeedLocked ? <Lock size={12} className="text-purple-400" /> : <Unlock size={12} />}
                            {isSeedLocked ? (lockedSeed !== null ? `Seed: ${lockedSeed}` : "Locking next seed...") : "Random Seed"}
                        </Label>
                    </div>
                </div>

                {directorOptions.length > 0 ? (
                    // ... (options view)
                    <div className="mb-4 space-y-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-purple-300 flex items-center gap-2">
                                <Sparkles size={14} /> Director AI Suggestions
                            </h3>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setDirectorOptions([])}>Cancel</Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {directorOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    disabled={isRendering}
                                    onClick={() => handleSelectOption(opt)}
                                    className="text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-purple-500 rounded-lg p-3 transition-all relative group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white bg-gray-900 px-1.5 py-0.5 rounded">{opt.id}</span>
                                        <span className="text-[10px] text-gray-400 border border-gray-500 px-1 rounded">{opt.aspect_ratio}</span>
                                    </div>
                                    <div className="font-medium text-sm text-purple-200 mb-1">{opt.label}</div>
                                    <div className="text-xs text-gray-400 line-clamp-3">{opt.description}</div>
                                    
                                    {isRendering && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                            <Loader2 className="animate-spin text-purple-500" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {/* ... (input area) */}
                        <div className="flex-1 relative">
                            <Textarea
                                value={scriptInput}
                                onChange={(e) => setScriptInput(e.target.value)}
                                placeholder="Describe the next scene... (e.g. 'Hero looks up at the sky in tears')"
                                className="min-h-[60px] bg-gray-900 border-gray-700 focus:border-purple-500 resize-none pr-10"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleDirect();
                                    }
                                }}
                            />
                            <div className="absolute right-3 bottom-3 text-gray-500">
                                <Camera size={16} />
                            </div>
                        </div>
                        <Button 
                            onClick={handleDirect} 
                            disabled={isDirecting || !scriptInput.trim()}
                            className="h-auto bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 w-24 flex flex-col gap-1"
                        >
                            {isDirecting ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    <span className="text-xs font-bold">Direct</span>
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div> <DirectorCutModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                cut={editingCut}
                onUpdate={fetchCuts}
            />
        </div>
    );
}
