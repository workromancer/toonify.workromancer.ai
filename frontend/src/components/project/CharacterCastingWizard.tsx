'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, X, Wand2, RefreshCw, Download } from 'lucide-react';
import api from '@/lib/api';

interface CharacterCastingWizardProps {
    projectId: string;
    stylePreset: string;
}

type Step = 'name' | 'appearance' | 'augment' | 'generate' | 'result';

export default function CharacterCastingWizard({ projectId, stylePreset }: CharacterCastingWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>('name');
    const [name, setName] = useState('');
    const [mood, setMood] = useState('Neutral');
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState('');
    const [description, setDescription] = useState('');
    const [isAugmenting, setIsAugmenting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [characterId, setCharacterId] = useState<string | null>(null);
    const [sheetUrl, setSheetUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // --- Steps Handlers ---

    const handleNameSubmit = () => {
        if (name.trim()) setStep('appearance');
    };

    const handleAddTag = () => {
        if (currentTag.trim() && !tags.includes(currentTag.trim())) {
            setTags([...tags, currentTag.trim()]);
            setCurrentTag('');
        }
    };

    const handleAugment = async () => {
        setIsAugmenting(true);
        try {
            const res = await api.post(`/projects/${projectId}/characters/casting/augment`, {
                name,
                tags,
                mood,
                style: stylePreset
            });
            // Assume response: { visual_description: "...", augmented_tags: [...] }
            setDescription(res.data.visual_description || "");
            if (res.data.augmented_tags) {
                setTags(res.data.augmented_tags);
            }
            setStep('augment'); // Review Augmented Text
        } catch (e) {
            console.error("Augment error", e);
            setError("Failed to augment text. Please try manual entry.");
            setDescription(tags.join(", ") + " " + mood); // Fallback
            setStep('augment');
        } finally {
            setIsAugmenting(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Create Character first
            const charRes = await api.post(`/projects/${projectId}/characters`, {
                name,
                default_mood: mood,
                appearance_tags: tags,
                description: description,
                consistency_seed: Math.floor(Math.random() * 1000000)
            });
            const newCharId = charRes.data.id;
            setCharacterId(newCharId);

            // Trigger Generation
            await api.post(`/projects/${projectId}/characters/casting/generate`, {
                character_id: newCharId,
                name,
                description,
                style: stylePreset
            });

            setStep('generate'); // Show Loading
        } catch (e) {
            console.error("Generation Start Error", e);
            setError("Failed to start generation.");
            setIsGenerating(false);
        }
    };

    // Polling Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 'generate' && characterId) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/characters/${characterId}`);
                    const char = res.data;
                    if (char.sheet_status === 'completed' && char.character_sheet_url) {
                        setSheetUrl(char.character_sheet_url);
                        setStep('result');
                        setIsGenerating(false);
                    } else if (char.sheet_status === 'failed') {
                        setError("Generation Failed. Please try again.");
                        setIsGenerating(false);
                        setStep('augment'); // Go back
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, characterId]);

    // --- Render Steps ---

    const renderNameStep = () => (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                    What's your character's name?
                </h1>
                <p className="text-gray-400 text-lg">Every legend begins with a name.</p>
            </div>
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jin Woo"
                        className="h-16 text-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 px-6 rounded-2xl focus:ring-primary/50 focus:border-primary transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                        autoFocus
                    />
                </div>
                <Button
                    onClick={handleNameSubmit}
                    disabled={!name.trim()}
                    className="h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 transition-all w-full md:w-auto md:self-start px-8"
                >
                    Next <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </div>
    );

    const renderAppearanceStep = () => (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                    Define {name}'s Core Traits
                </h1>
                <p className="text-gray-400">Keywords, Mood, and Style.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Tags Input */}
                    <div className="space-y-3">
                        <Label className="text-white">Appearance Tags</Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 min-h-[60px] focus-within:ring-1 focus-within:ring-primary/50">
                            {tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white gap-2 text-sm">
                                    {tag}
                                    <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                            <input
                                className="bg-transparent border-none outline-none text-white placeholder:text-white/20 flex-1 min-w-[120px] text-sm"
                                placeholder="Add tag (Enter)..."
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            />
                        </div>
                        <p className="text-xs text-gray-500">e.g. Silver hair, Red eyes, Cyberpunk armor, Scars</p>
                    </div>

                    {/* Mood Selection */}
                    <div className="space-y-3">
                        <Label className="text-white">Default Mood</Label>
                        <div className="grid grid-cols-4 gap-3">
                            {['Happy', 'Neutral', 'Sad', 'Angry'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMood(m)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${mood === m
                                            ? 'border-primary bg-primary/10 text-white'
                                            : 'border-transparent bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <span className="text-xs font-bold">{m}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col justify-end">
                    <Button
                        onClick={handleAugment}
                        disabled={isAugmenting}
                        className="h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all w-full shadow-lg shadow-purple-900/20"
                    >
                        {isAugmenting ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enhancing...</>
                        ) : (
                            <><Wand2 className="mr-2 h-5 w-5" /> AI Enhance & Generate</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderAugmentReview = () => (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">Review Concept</h1>
                <p className="text-gray-400 text-sm">AI has expanded your concept. Edit if needed.</p>
            </div>

            <div className="flex-1 flex flex-col gap-4 min-h-0">
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white/90 leading-relaxed resize-none focus:ring-1 focus:ring-primary/50 outline-none font-mono text-sm"
                />
            </div>

            <div className="flex gap-4 pt-2">
                <Button variant="ghost" onClick={() => setStep('appearance')} className="flex-1 h-12 text-gray-400 hover:text-white">
                    Back
                </Button>
                <Button
                    onClick={handleGenerate}
                    className="flex-[2] h-12 font-bold rounded-xl bg-primary hover:bg-primary/90 text-white"
                >
                    Generate Character Sheet
                </Button>
            </div>
        </div>
    );

    const renderGenerating = () => (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-white">Summoning {name}...</h2>
            <p className="text-gray-400 mt-2 text-center max-w-sm">Creating reference sheet compatible with {stylePreset} style.<br />This might take up to 30 seconds.</p>
        </div>
    );

    const renderResult = () => (
        <div className="flex flex-col h-full animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{name} Created!</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(`/project/${projectId}`)}>
                        Finish
                    </Button>
                    <Button onClick={() => setStep('appearance')}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Remake
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 overflow-hidden relative group">
                {sheetUrl && (
                    <img src={sheetUrl} alt={name} className="w-full h-full object-contain" />
                )}

                {/* Overlay actions */}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-4">
                    <Button variant="secondary" className="bg-white/10 backdrop-blur text-white hover:bg-white/20">
                        <Download className="mr-2 h-4 w-4" /> Download Sheet
                    </Button>
                </div>
            </div>
        </div>
    );

    // --- Main Layout ---

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full mb-8 overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{
                        width: step === 'name' ? '20%'
                            : step === 'appearance' ? '40%'
                                : step === 'augment' ? '60%'
                                    : step === 'generate' ? '80%'
                                        : '100%'
                    }}
                />
            </div>

            <div className="flex-1">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {step === 'name' && renderNameStep()}
                {step === 'appearance' && renderAppearanceStep()}
                {step === 'augment' && renderAugmentReview()}
                {step === 'generate' && renderGenerating()}
                {step === 'result' && renderResult()}
            </div>
        </div>
    );
}
