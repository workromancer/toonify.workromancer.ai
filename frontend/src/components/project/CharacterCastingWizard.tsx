'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    Loader2,
    ArrowRight,
    X,
    Wand2,
    RefreshCw,
    Download,
    Check,
    MoveLeft,
    MoveRight,
    User,
    Palette,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import api from '@/lib/api';
import CharacterConceptCard from './CharacterConceptCard';

interface CharacterCastingWizardProps {
    projectId: string;
    stylePreset: string;
}

type StepName = 'name' | 'appearance' | 'selection' | 'augment' | 'generate' | 'result';

interface ConceptOption {
    name: string;
    age: string;
    personality: string;
    features: string[];
    pros: string[];
    cons: string[];
    visual_description: string;
    reason?: string;
}

// Inline StepIndicator component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    return (
        <div className="w-full relative mb-8 px-4">
            <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/10 -translate-y-1/2 z-0"></div>
            <motion.div
                className="absolute top-1/2 left-4 h-[1px] bg-primary -translate-y-1/2 z-1 shadow-[0_0_10px_rgba(55,19,236,0.6)]"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.max(0, ((currentStep - 1) / (totalSteps - 1))) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ maxWidth: 'calc(100% - 2rem)' }}
            />

            <div className="relative z-10 flex justify-between">
                {/* 5 Total Steps: Name(1), Traits(2), Concepts(3), Review(4), Gen(5) */}
                {[...Array(totalSteps)].map((_, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum <= currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center gap-2 relative group">
                            <div
                                className={cn(
                                    "w-3 h-3 rounded-full transition-all duration-300 border-2",
                                    isActive ? "bg-primary border-primary shadow-[0_0_10px_rgba(55,19,236,0.8)]" : "bg-background-dark border-white/20",
                                    isCurrent && "scale-150 ring-4 ring-primary/20 bg-white border-white"
                                )}
                            ></div>
                            <span className={cn(
                                "text-[10px] uppercase tracking-widest font-bold transition-all duration-300 absolute -bottom-6 w-24 text-center select-none",
                                isActive ? "text-white opacity-100" : "text-gray-500 opacity-0 group-hover:opacity-50"
                            )}>
                                {stepNum === 1 && 'Name'}
                                {stepNum === 2 && 'Traits'}
                                {stepNum === 3 && 'Concepts'}
                                {stepNum === 4 && 'Review'}
                                {stepNum === 5 && 'Generate'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function CharacterCastingWizard({ projectId, stylePreset }: CharacterCastingWizardProps) {
    const router = useRouter();

    // State
    const [step, setStep] = useState<StepName>('name');
    const [direction, setDirection] = useState(0); // For animation direction

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

    const [conceptOptions, setConceptOptions] = useState<ConceptOption[]>([]);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

    // Helpers to map step name to number for indicator
    const getStepNumber = (s: StepName) => {
        switch (s) {
            case 'name': return 1;
            case 'appearance': return 2;
            case 'selection': return 3;
            case 'augment': return 4;
            case 'generate': return 5;
            case 'result': return 5;
            default: return 1;
        }
    };

    const handleNextStep = (next: StepName) => {
        setDirection(1);
        setStep(next);
        setError(null);
    };

    const handlePrevStep = (prev: StepName) => {
        setDirection(-1);
        setStep(prev);
        setError(null);
    };

    // --- Logic Handlers ---

    const handleNameSubmit = () => {
        if (name.trim()) handleNextStep('appearance');
    };

    const handleAddTag = () => {
        if (currentTag.trim() && !tags.includes(currentTag.trim())) {
            setTags([...tags, currentTag.trim()]);
            setCurrentTag('');
        }
    };

    const handleAugment = async () => {
        setIsAugmenting(true);
        setError(null);
        try {
            const res = await api.post(`/characters/augment`, {
                name,
                tags,
                mood,
                project_id: projectId
            });
            // Handle new list response
            if (res.data.options && Array.isArray(res.data.options)) {
                setConceptOptions(res.data.options);
                handleNextStep('selection');
            } else {
                // Fallback for single object (legacy/error)
                setDescription(res.data.visual_description || "");
                if (res.data.augmented_tags) {
                    setTags(res.data.augmented_tags);
                }
                handleNextStep('augment');
            }
        } catch (e) {
            console.error("Augment error", e);
            setError("Failed to augment text. Please try manual entry.");
            setDescription(tags.join(", ") + " " + mood);
            handleNextStep('augment'); // Skip selection if failed
        } finally {
            setIsAugmenting(false);
        }
    };

    const handleSelectOption = (idx: number) => {
        setSelectedOptionIndex(idx);
        const opt = conceptOptions[idx];
        if (opt) {
            setName(opt.name); // Usually same, but maybe varied
            setTags(opt.features); // Update tags from features
            setDescription(opt.visual_description);
            // Mood stays as Default Mood setting unless we want to override? Let's keep user selection for mood unless option specifies.
        }
    };

    const handleConfirmSelection = () => {
        if (selectedOptionIndex !== null) {
            handleNextStep('augment');
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            // Create Character
            // Backend expects: name, project_id, appearance_tags, default_mood
            const charRes = await api.post(`/characters`, {
                name,
                project_id: projectId,
                default_mood: mood,
                appearance_tags: tags,
                // description: description, // Backend create_character doesn't take description in body yet? 
                // Let's check CharacterCreate model in characters.py: name, project_id, appearance_tags, default_mood.
                // Description is updated via UPDATE or separate logic? 
                // Ah, backend create_character doesn't accept description.
                // We should update it after creation if needed, OR just proceed since generate uses the passed description?
                // Wait, generate_character_image task queries the character from DB.
                // It uses character.description.
                // So we MUST save description to DB.
                // We need to UPDATE the character with description after creation.
            });
            const newCharId = charRes.data.id;
            setCharacterId(newCharId);

            // Update description
            await api.patch(`/characters/${newCharId}`, {
                description: description
            });

            // Trigger Generation
            await api.post(`/characters/${newCharId}/generate`, {});

            handleNextStep('generate');
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
                        // Stay on generate or go back? user choice usually, but let's show error
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, characterId]);


    // --- Animations ---
    const stepVariants = {
        hidden: (dir: number) => ({
            opacity: 0,
            x: dir > 0 ? 30 : -30,
            scale: 0.95
        }),
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 30 } as any
        },
        exit: (dir: number) => ({
            opacity: 0,
            x: dir < 0 ? 30 : -30,
            scale: 0.95,
            transition: { duration: 0.2 } as any
        })
    };

    // --- Steps Rendering ---

    const renderNameStep = () => (
        <motion.div
            key="name"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col gap-6"
        >
            <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                    <User className="w-10 h-10 text-primary" />
                </div>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Character Name..."
                    className="h-20 text-3xl font-bold bg-black/20 border-white/10 focus-visible:ring-primary text-center text-white placeholder:text-white/20 rounded-xl px-6 max-w-md mx-auto"
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                    autoFocus
                />
            </div>
        </motion.div>
    );

    const renderAppearanceStep = () => (
        <motion.div
            key="appearance"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col gap-6 h-full"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Tags Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Palette className="w-4 h-4 text-purple-400" />
                        <Label className="text-white font-bold">Visual Tags</Label>
                    </div>

                    <div className="flex-1 bg-black/20 rounded-lg p-3 content-start flex flex-wrap gap-2 min-h-[120px]">
                        {tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary-foreground gap-1 border border-primary/30">
                                {tag}
                                <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>

                    <div className="relative">
                        <Input
                            className="bg-black/20 border-white/10 text-white placeholder:text-white/20 pr-10"
                            placeholder="Add trait (e.g. Blue Hair)..."
                            value={currentTag}
                            onChange={(e) => setCurrentTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <button
                            onClick={handleAddTag}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Mood Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <Label className="text-white font-bold">Default Mood</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 flex-1 content-start">
                        {['Happy', 'Neutral', 'Sad', 'Angry', 'Serious', 'Mysterious'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMood(m)}
                                className={cn(
                                    "flex items-center justify-center p-3 rounded-lg border transition-all h-12",
                                    mood === m
                                        ? "border-primary bg-primary/20 text-white shadow-sm shadow-primary/20"
                                        : "border-white/5 bg-black/20 text-gray-400 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <span className="text-sm font-medium">{m}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderSelectionStep = () => (
        <motion.div
            key="selection"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col h-full gap-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-[400px]">
                {conceptOptions.map((opt, idx) => (
                    <CharacterConceptCard
                        key={idx}
                        option={opt}
                        isSelected={idx === selectedOptionIndex}
                        onSelect={() => handleSelectOption(idx)}
                    />
                ))}
            </div>
        </motion.div>
    );

    const renderAugmentStep = () => (
        <motion.div
            key="augment"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col h-full gap-4"
        >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col flex-1 gap-2">
                <div className="flex justify-between items-center mb-2">
                    <Label className="text-white font-bold flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-purple-400" /> AI Enhanced Description
                    </Label>
                    <span className="text-xs text-gray-500">Editable</span>
                </div>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex-1 w-full bg-black/20 border-white/10 p-4 text-white/90 leading-relaxed resize-none focus:ring-1 focus:ring-primary/50 font-mono text-sm rounded-lg"
                    placeholder="Refine the character description here..."
                />
            </div>
        </motion.div>
    );

    const renderGenerateStep = () => (
        <motion.div
            key="generate"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col items-center justify-center h-[400px]"
        >
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                <Loader2 className="w-20 h-20 text-primary animate-spin relative z-10" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-white">Summoning {name}...</h2>
            <p className="text-gray-400 mt-2 text-center max-w-sm">
                Creating character sheet in <span className="text-white font-semibold">{stylePreset}</span> style.
            </p>
        </motion.div>
    );

    const renderResultStep = () => (
        <motion.div
            key="result"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col h-full items-center justify-center p-2"
        >
            <div className="relative group w-full max-h-[500px] flex items-center justify-center bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                {sheetUrl ? (
                    <img src={sheetUrl} alt={name} className="max-w-full max-h-full object-contain shadow-2xl" />
                ) : (
                    <div className="text-gray-500 flex flex-col items-center">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span>No Image Generated</span>
                    </div>
                )}
            </div>
        </motion.div>
    );

    // --- Layout ---

    return (
        <div className="min-h-screen bg-background-dark text-white flex items-center justify-center p-4 font-display overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

            <main className="w-full max-w-4xl relative z-10 flex flex-col min-h-[600px] gap-6">

                {/* Header */}
                <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-5 duration-500">
                    <h1 className="text-3xl font-black tracking-tight text-white mb-2">
                        {step === 'name' && 'Who are they?'}
                        {step === 'appearance' && `Define ${name}'s Look`}
                        {step === 'selection' && 'Choose a Direction'}
                        {step === 'augment' && 'Review Concept'}
                        {step === 'generate' && 'Magic in Progress'}
                        {step === 'result' && `${name} is Ready!`}
                    </h1>
                    <p className="text-gray-400 text-sm font-light">
                        {step === 'name' && 'Every great story needs a protagonist.'}
                        {step === 'appearance' && 'Add traits and mood to guide the AI.'}
                        {step === 'selection' && 'Select the best profile match for your story.'}
                        {step === 'augment' && 'Refine the description before generation.'}
                        {step === 'generate' && 'Depending on complexity, this may take a moment.'}
                        {step === 'result' && 'Your character has been cast successfully.'}
                    </p>
                </div>

                {/* Content Card */}
                <div className="bg-[#1a1726]/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8 flex-1 flex flex-col relative overflow-hidden transition-all duration-300">

                    <StepIndicator currentStep={getStepNumber(step)} totalSteps={5} />

                    <div className="flex-1 flex flex-col justify-center relative min-h-[300px]">
                        <AnimatePresence custom={direction} mode="wait">
                            {step === 'name' && renderNameStep()}
                            {step === 'appearance' && renderAppearanceStep()}
                            {step === 'selection' && renderSelectionStep()}
                            {step === 'augment' && renderAugmentStep()}
                            {step === 'generate' && renderGenerateStep()}
                            {step === 'result' && renderResultStep()}
                        </AnimatePresence>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-2 animate-in fade-in">
                            <span className="font-bold text-red-500">Error:</span> {error}
                        </div>
                    )}

                    {/* Footer Navigation */}
                    {step !== 'generate' && (
                        <footer className="mt-8 flex justify-between items-center pt-6 border-t border-white/5">
                            {/* Back Button */}
                            <div className="flex-1">
                                {step !== 'name' && step !== 'result' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            if (step === 'appearance') handlePrevStep('name');
                                            if (step === 'selection') handlePrevStep('appearance');
                                            if (step === 'augment') handlePrevStep('selection');
                                            // if step generate (hidden)
                                        }}
                                        className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
                                    >
                                        <MoveLeft size={16} /> Back
                                    </Button>
                                )}
                                {step === 'result' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => handlePrevStep('appearance')} // "Remake" logic
                                        className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
                                    >
                                        <RefreshCw size={16} /> New Version
                                    </Button>
                                )}
                            </div>

                            {/* Action Button */}
                            <div className="flex-1 flex justify-end">
                                {step === 'name' && (
                                    <Button
                                        onClick={handleNameSubmit}
                                        disabled={!name.trim()}
                                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-primary/20"
                                    >
                                        Next <MoveRight className="ml-2 w-4 h-4" />
                                    </Button>
                                )}
                                {step === 'appearance' && (
                                    <Button
                                        onClick={handleAugment}
                                        disabled={isAugmenting}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-purple-900/20"
                                    >
                                        {isAugmenting ? <Loader2 className="animate-spin" /> : <Wand2 className="mr-2 w-4 h-4" />}
                                        Enhance
                                    </Button>
                                )}
                                {step === 'selection' && (
                                    <Button
                                        onClick={handleConfirmSelection}
                                        disabled={selectedOptionIndex === null}
                                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-primary/20"
                                    >
                                        Select & Review <MoveRight className="ml-2 w-4 h-4" />
                                    </Button>
                                )}
                                {step === 'augment' && (
                                    <Button
                                        onClick={handleGenerate}
                                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-primary/20"
                                    >
                                        Generate <Sparkles className="ml-2 w-4 h-4" />
                                    </Button>
                                )}
                                {step === 'result' && (
                                    <Button
                                        onClick={() => router.push(`/project/${projectId}`)}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-green-900/20"
                                    >
                                        Finish <Check className="ml-2 w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </footer>
                    )}
                </div>
            </main>
        </div>
    );
}
