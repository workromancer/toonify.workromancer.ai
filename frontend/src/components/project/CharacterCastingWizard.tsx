'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Loader2,
    MoveLeft,
    MoveRight,
    Sparkles,
    Check,
    X,
    Palette,
    Wand2,
} from 'lucide-react';
import { SectionLabel } from '@/components/ui/section-label';
import { SelectionCard } from '@/components/ui/selection-card';
import { RadarChart } from '@/components/ui/radar-chart'; // New Import
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import { CustomLoader } from '@/components/ui/custom-loader';

interface CharacterCastingWizardProps {
    projectId: string;
    projectTitle?: string;
    projectGenre?: string;
}

type StepName = 'concept' | 'style' | 'analyzing' | 'role';

// Inline StepIndicator component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    const t = useTranslations('CharacterWizard.steps');
    const stepKeys = ['concept', 'style', 'role'];

    return (
        <div className="w-full relative mb-8 px-4 flex justify-center">
            <div className="relative w-full max-w-lg">
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 z-0"></div>
                <motion.div
                    className="absolute top-1/2 left-0 h-[1px] bg-primary -translate-y-1/2 z-1 shadow-[0_0_10px_rgba(55,19,236,0.6)]"
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.max(0, ((currentStep - 1) / (totalSteps - 1))) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                />

                <div className="relative z-10 flex justify-between w-full">
                    {/* Steps: Concept(1), Style(2), Role(3) */}
                    {stepKeys.map((key, index) => {
                        const stepNum = index + 1;
                        const isActive = stepNum <= currentStep;
                        const isCurrent = stepNum === currentStep;
                        const label = t(key).toUpperCase();

                        return (
                            <div key={index} className="flex flex-col items-center gap-3 relative group cursor-default">
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-full transition-all duration-300 border-2 box-content",
                                        isActive ? "bg-primary border-primary shadow-[0_0_10px_rgba(168,85,247,0.8)]" : "bg-[#0f0a1e] border-white/20", // Custom dark bg color for unactive
                                        isCurrent && "ring-4 ring-primary/20 bg-primary border-white"
                                    )}
                                ></div>
                                <span className={cn(
                                    "text-[10px] uppercase tracking-widest font-bold transition-all duration-300 absolute top-8 w-24 text-center select-none",
                                    isActive ? "text-purple-300/90" : "text-gray-600"
                                )}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


export default function CharacterCastingWizard({ projectId, projectTitle, projectGenre }: CharacterCastingWizardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const t = useTranslations('CharacterWizard');
    const tRoles = useTranslations('CharacterWizard.roles');
    const locale = useLocale();

    // Steps state
    const [step, setStep] = useState<StepName>('concept');
    const [direction, setDirection] = useState(0);

    // Concept Step Data
    const [name, setName] = useState('');
    const [age, setAge] = useState('');

    // Style Step Data
    const [visualKeywords, setVisualKeywords] = useState<string[]>([]);
    const [currentKeyword, setCurrentKeyword] = useState('');
    const [themeColor, setThemeColor] = useState<string>('#3b82f6'); // Default Blue
    const [personalityTypes, setPersonalityTypes] = useState<string[]>([]);

    // Role Step Data - Initialized later or here? 
    // Typescript might complain if I use variable before declaration. 
    // I will use a hardcoded default string that matches the first archetype title.
    // Archetypes Data moved up for state initialization
    const archetypes = [
        {
            id: 'protagonist',
            title: t('archetypes.protagonist.title'),
            subtitle: t('archetypes.protagonist.subtitle'),
            tags: t.raw('archetypes.protagonist.tags') as string[],
            description: t('archetypes.protagonist.description'),
            stats: { strength: 70, intelligence: 60, charisma: 85, luck: 80, empathy: 75, leadership: 80 }
        },
        {
            id: 'antagonist',
            title: t('archetypes.antagonist.title'),
            subtitle: t('archetypes.antagonist.subtitle'),
            tags: t.raw('archetypes.antagonist.tags') as string[],
            description: t('archetypes.antagonist.description'),
            stats: { strength: 85, intelligence: 90, charisma: 90, luck: 40, empathy: 20, leadership: 85 }
        },
        {
            id: 'second_lead',
            title: t('archetypes.second_lead.title'),
            subtitle: t('archetypes.second_lead.subtitle'),
            tags: t.raw('archetypes.second_lead.tags') as string[],
            description: t('archetypes.second_lead.description'),
            stats: { strength: 60, intelligence: 70, charisma: 75, luck: 50, empathy: 90, leadership: 60 }
        },
        {
            id: 'scene_stealer',
            title: t('archetypes.scene_stealer.title'),
            subtitle: t('archetypes.scene_stealer.subtitle'),
            tags: t.raw('archetypes.scene_stealer.tags') as string[],
            description: t('archetypes.scene_stealer.description'),
            stats: { strength: 40, intelligence: 50, charisma: 95, luck: 90, empathy: 60, leadership: 30 }
        }
    ];

    const [selectedRole, setSelectedRole] = useState<string>('protagonist');


    // Processing State
    const [isGenerating, setIsGenerating] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [suggestionLoading, setSuggestionLoading] = useState<string | null>(null);
    const [roleDescription, setRoleDescription] = useState<string>('');
    const [characterStats, setCharacterStats] = useState<Record<string, number> | null>(null);

    // Helpers
    const getStepNumber = (s: StepName) => {
        switch (s) {
            case 'concept': return 1;
            case 'style': return 2;
            case 'analyzing': return 2; // Conceptually between 2 and 3
            case 'role': return 3;
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

    const handleConceptSubmit = () => {
        if (name.trim()) handleNextStep('style');
    };

    const handleAddKeyword = () => {
        if (currentKeyword.trim() && !visualKeywords.includes(currentKeyword.trim())) {
            setVisualKeywords([...visualKeywords, currentKeyword.trim()]);
            setCurrentKeyword('');
        }
    };

    const handleStyleSubmit = () => {
        handleNextStep('analyzing');
    };

    const handleSuggestion = async (type: 'name' | 'visuals' | 'lore') => {
        if (suggestionLoading) return;
        setSuggestionLoading(type);
        try {
            const res = await api.post('/characters/suggest', {
                project_id: projectId,
                type: type,
                current_name: name,
                age: age,
                role: archetypes.find(a => a.id === selectedRole)?.title || selectedRole,
                visual_keywords: visualKeywords,
                personality: personalityTypes.join(', '),
                language: locale
            });

            if (type === 'name' && res.data) {
                if (res.data.name) setName(res.data.name);
                if (res.data.age) setAge(res.data.age.toString());
            } else if (type === 'visuals') {
                // Check if list or wrapped
                let newKeywords: string[] = [];
                if (Array.isArray(res.data)) newKeywords = res.data;
                else if (res.data.suggestion && Array.isArray(res.data.suggestion)) newKeywords = res.data.suggestion;
                else if (typeof res.data.suggestion === 'string') {
                    // Try parsing if string
                    try { newKeywords = JSON.parse(res.data.suggestion); } catch (e) { }
                }

                if (newKeywords.length > 0) {
                    const unique = newKeywords.filter((k: string) => !visualKeywords.includes(k));
                    setVisualKeywords([...visualKeywords, ...unique]);
                }
            } else if (type === 'lore' && res.data.suggestion) {
                setRoleDescription(res.data.suggestion);
            }
        } catch (e) {
            console.error(e);
            toast({ title: t('toasts.suggestionFailed'), description: t('toasts.suggestionFailedDesc'), variant: "destructive" });
        } finally {
            setSuggestionLoading(null);
        }
    };

    // Analyzing Effect
    useEffect(() => {
        if (step === 'analyzing') {
            const analyze = async () => {
                try {
                    const res = await api.post('/characters/analyze', {
                        project_id: projectId,
                        name: name,
                        age: age,
                        visual_keywords: visualKeywords,
                        personality: personalityTypes.join(', '),
                        language: locale
                    });

                    if (res.data) {
                        const { recommended_role, lore, stats } = res.data;

                        // Map recommended_role to internal titles if needed (or just assume AI follows instructions)
                        // Ideally we find the matching archetype object
                        // Map recommended_role
                        const match = archetypes.find(a => a.title === recommended_role || recommended_role.includes(a.title));
                        if (match) {
                            setSelectedRole(match.id);
                        } else {
                            // Fallback
                            setSelectedRole(archetypes[0].id);
                        }

                        if (lore) setRoleDescription(lore);

                        // Use AI stats if available, otherwise will fallback to archetype stats in render
                        if (stats) setCharacterStats(stats);
                    }
                } catch (e) {
                    console.error("Analysis failed", e);
                    // Fallback to defaults
                    setSelectedRole(archetypes[0].id);
                } finally {
                    // Ensure minimum time for transition smoothness or just go next
                    handleNextStep('role');
                }
            };
            analyze();
        }
    }, [step]);


    const handleFinalize = async () => {
        if (!selectedRole) return;
        setIsGenerating(true);
        setError(null);

        // Gather Data
        const currentArch = archetypes.find(a => a.id === selectedRole);
        const roleTitle = currentArch?.title || selectedRole;
        const descriptionComplete = roleDescription ? `Age: ${age}. Role: ${roleTitle}. Personality: ${personalityTypes.join(', ')}. Visuals: ${visualKeywords.join(', ')}. Lore: ${roleDescription}` : `Age: ${age}. Role: ${roleTitle}. Personality: ${personalityTypes.join(', ')}. Visuals: ${visualKeywords.join(', ')}.`;

        const profileData = {
            age: age,
            role: roleTitle,
            theme_color: themeColor,
            personality_type: personalityTypes.join(', '),
            lore: roleDescription,
            stats: characterStats // Save stats in profile
        };

        try {
            const charRes = await api.post(`/characters`, {
                name: name,
                project_id: projectId,
                default_mood: personalityTypes.length > 0 ? personalityTypes : ['Neutral'],
                appearance_tags: visualKeywords,
                description: descriptionComplete,
                profile: profileData
            });
            const newCharId = charRes.data.id;

            // Trigger Generation Async
            api.post(`/characters/${newCharId}/generate`, {});

            toast({
                title: t('toasts.createdTitle'),
                description: t('toasts.createdDesc', { name, role: roleTitle }),
            });

            router.push(`/project/${projectId}`);
        } catch (e) {
            console.error("Creation Error", e);
            setError(t('toasts.createFailed'));
            setIsGenerating(false);
        }
    };


    // --- Animations ---
    const stepVariants = {
        hidden: (dir: number) => ({
            opacity: 0,
            x: dir > 0 ? 30 : -30,
            scale: 0.98
        }),
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 30 } as any // eslint-disable-line @typescript-eslint/no-explicit-any
        },
        exit: (dir: number) => ({
            opacity: 0,
            x: dir < 0 ? 30 : -30,
            scale: 0.98,
            transition: { duration: 0.2 } as any // eslint-disable-line @typescript-eslint/no-explicit-any
        })
    };


    // --- Render Steps ---

    const renderConceptStep = () => (
        <motion.div
            key="concept"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col gap-8 py-4 px-12"
        >
            <div className="space-y-6 max-w-md mx-auto w-full">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <SectionLabel className="text-[#d8b4fe]">{t('inputs.nameLabel')}</SectionLabel>
                    </div>
                </div>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('inputs.namePlaceholder')}
                    size="xl"
                    className="text-center"
                    autoFocus
                />
            </div>

            <div className="space-y-3">
                <SectionLabel className="text-[#d8b4fe]">{t('inputs.ageLabel')}</SectionLabel>
                <Input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder={t('inputs.agePlaceholder')}
                    size="xl"
                    className="text-center"
                />
            </div>
        </motion.div>
    );

    const renderStyleStep = () => (
        <motion.div
            key="style"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col h-full w-full px-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* LEFT COLUMN: Visuals */}
                <div className="flex flex-col gap-8">
                    {/* Keywords */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <SectionLabel className="text-[#d8b4fe]" icon={<Sparkles className="w-3 h-3" />}>
                                {t('inputs.visualLabel')}
                            </SectionLabel>
                        </div>

                        <div className="bg-[#0B0d12] border border-[#2a2f3a] rounded-xl p-4 min-h-[140px] flex flex-col gap-3 transition-all focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/50">
                            <div className="flex flex-wrap gap-2">
                                {visualKeywords.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="px-2.5 py-1 bg-[#1c162e] text-purple-200 border border-purple-500/20 hover:bg-[#251d3d] transition-colors gap-1.5 font-normal">
                                        {tag}
                                        <button onClick={() => setVisualKeywords(visualKeywords.filter((_, idx) => idx !== i))} className="text-purple-400 hover:text-white transition-colors ml-0.5">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="relative mt-auto">
                                <Input
                                    className="bg-transparent border-none text-white placeholder:text-white/20 p-0 focus-visible:ring-0 h-auto text-sm"
                                    placeholder={t('inputs.visualPlaceholder')}
                                    value={currentKeyword}
                                    onChange={(e) => setCurrentKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                                />
                                {currentKeyword && (
                                    <button
                                        onClick={handleAddKeyword}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Theme Color */}
                    <div className="space-y-3">
                        <SectionLabel className="text-[#d8b4fe]" icon={<Palette className="w-3 h-3" />}>
                            {t('inputs.themeLabel')}
                        </SectionLabel>
                        <div className="flex gap-3">
                            {['#ef4444', '#3b82f6', '#10b981', '#B49221', '#8b5cf6', '#252830', '#9ca3af', '#be185d'].map((color) => {
                                const isSelected = themeColor === color;
                                return (
                                    <button
                                        key={color}
                                        onClick={() => setThemeColor(color)}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-all relative",
                                            isSelected ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                                        )}
                                        style={{ backgroundColor: color }}
                                    >
                                        {isSelected && <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Personality */}
                <div className="flex flex-col gap-3">
                    <SectionLabel className="text-[#fbbf24]" icon={<span className='w-3 h-3 text-center leading-3'>☺</span>}>
                        {t('inputs.personalityLabel')}
                    </SectionLabel>

                    <div className="grid grid-cols-2 gap-3 h-full">
                        {[
                            'Cheerful', 'Serious',
                            'Cold', 'Tsundere',
                            'Mysterious', 'Melancholic',
                            'Pure', 'Madness'
                        ].map((pType) => {
                            const isSelected = personalityTypes.includes(pType);
                            // We use custom class for orange override if needed, or stick to 'filled' which defaults to primary (purple).
                            // The original had orange. Let's try to override via className to keep the ID "orange" feeling if desired, or let it be purple.
                            // I'll stick to 'filled' but override the selected style to be orange to match original design.

                            return (
                                <SelectionCard
                                    key={pType}
                                    variant="filled"
                                    selected={isSelected}
                                    onClick={() => {
                                        if (isSelected) setPersonalityTypes(personalityTypes.filter(t => t !== pType));
                                        else setPersonalityTypes([...personalityTypes, pType]);
                                    }}
                                    className={cn(
                                        "flex items-center justify-center font-medium",
                                        isSelected && "bg-[#ea580c] border-[#ea580c] shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                                    )}
                                >
                                    {t(`personalities.${pType}`)}
                                </SelectionCard>
                            )
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    // --- Archetypes Data ---
    // Archetypes Data (Moved up)

    // Role Step Data


    const currentArchetype = archetypes.find(a => a.id === selectedRole) || archetypes[0];

    useEffect(() => {
        if (step === 'role' && !selectedRole) {
            setSelectedRole(archetypes[0].id);
        }
    }, [step]);

    // Update role description when archetype changes (if not edited or generic way to update?)
    // Actually, we want to set it initially when selectedRole changes, unless we customized it?
    // For simplicity, whenever selectedRole changes, we reset description to archetype default.
    useEffect(() => {
        if (currentArchetype) {
            // If we don't have AI stats (manually navigating?), use archetype defaults
            if (!characterStats) {
                // But wait, if we got stats from AI, we set them.
                // If user switches role, should stats update? 
                // Currently, characterStats is populated ONCE by AI.
                // If user clicks a role, we CAN reset it to null to show archetype defaults?
                // Or we prioritize displaying characterStats if it matches the current role selection?
                // Let's implement this: When rendering, prioritize `characterStats` IF it was generated for this specific flow.
                // But simpler: just initialize it.
            }
        }
    }, [currentArchetype, characterStats]);           // Issue: this prevents switching descriptions when clicking different cards if we pre-filled it.
    // Better: We need to know if the description is "dirty" or "custom".
    // For now, let's just NOT auto-overwrite if it looks like custom lore (lengthy?).
    // Or better: update description on click in the selection card handler, not in useEffect.



    const renderRoleStep = () => (
        <motion.div
            key="role"
            custom={direction}
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex gap-6 h-full w-full px-4"
        >
            {/* Left Sidebar: Roles List */}
            <div className="w-1/3 flex flex-col gap-3 pr-2 overflow-y-auto custom-scrollbar">
                <SectionLabel className="mb-2 text-gray-500">{tRoles('selectRole')}</SectionLabel>
                {archetypes.map((arch) => (
                    <SelectionCard
                        key={arch.id}
                        selected={selectedRole === arch.id}
                        onClick={() => {
                            setSelectedRole(arch.id);
                            setRoleDescription(arch.description); // Reset description
                            setCharacterStats(null); // Reset to archetype stats when manually switching
                        }}
                        className="flex flex-col items-start"
                    >
                        <h4 className={cn("font-bold text-sm mb-2", selectedRole === arch.id ? "text-white" : "text-gray-400")}>
                            {arch.title}
                        </h4>
                        <div className="flex gap-1.5 flex-wrap">
                            {arch.tags.map(t => (
                                <Badge key={t} variant="secondary" className="bg-black/40 text-[10px] px-1.5 py-0.5 text-gray-500 border border-white/5">
                                    {t}
                                </Badge>
                            ))}
                        </div>
                    </SelectionCard>
                ))}
            </div>

            {/* Right Panel: Details */}
            <div className="flex-1 bg-[#0B0d12] border border-[#2a2f3a] rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-start z-10">
                    <div>
                        <div className="text-purple-400 text-xs font-mono font-bold tracking-wider mb-1">{currentArchetype.subtitle}</div>
                        <h2 className="text-2xl font-bold text-white">{currentArchetype.title}</h2>
                    </div>
                    {age && <Badge variant="outline" className="text-gray-400 border-white/10">{age} yrs</Badge>}
                </div>

                {/* Description Box */}
                <div className="space-y-2 z-10">
                    <div className="flex justify-between items-center">
                        <SectionLabel className="text-gray-500">{tRoles('profile')}</SectionLabel>
                    </div>
                    <div className="bg-[#151921] rounded-lg p-4 text-gray-300 text-sm leading-relaxed border border-white/5 min-h-[80px]">
                        {roleDescription}
                    </div>
                </div>

                {/* Stats Radar Chart */}
                <div className="flex-1 flex items-center justify-center -mt-4 relative z-20">
                    <RadarChart
                        data={Object.entries(characterStats || currentArchetype.stats).map(([k, v]) => ({ label: k, value: (v as number) }))}
                        size={220}
                        color="#a855f7"
                    />
                </div>

                {/* Background Decoration */}
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none"></div>
            </div>
        </motion.div>
    );

    // Placeholder for other steps to avoid errors during incremental rebuild
    const renderOtherSteps = () => (
        <div className='text-center text-white/50 w-full h-full relative'>
            <ProcessingOverlay
                isVisible={step === 'analyzing'}
                title={t('headers.analyzing')}
                description={t('headers.analyzingDesc', { name })}
            />
            {step === 'style' && renderStyleStep()}
            {step === 'role' && renderRoleStep()}
        </div>
    );


    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 font-sans selection:bg-purple-500/30">
            {/* Header */}
            <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-sm">
                <div className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={() => router.back()}>
                    <MoveLeft className="w-5 h-5" />
                    <span className="font-medium">{t('buttons.backToProject')}</span>
                </div>

                {/* Project Metatdata Header */}
                <div className="flex flex-col items-center gap-1 justify-center">
                    {projectTitle && (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg tracking-tight">{projectTitle}</span>
                            {projectGenre && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 py-0 border-white/10 bg-white/5 text-gray-400 font-normal">
                                    {projectGenre}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-xs font-mono text-gray-600">v.2.2.1</div>
            </header>



            <main className="w-full max-w-5xl relative z-10 flex flex-col gap-8 mt-16">
                {/* Title Section */}
                <div className="text-center space-y-2 mb-4">
                    {step === 'concept' && (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight text-white/90">{t('headers.concept')}</h1>
                            <p className="text-gray-500 text-sm">{t('headers.conceptDesc', { world_context: 'world_context' })}</p>
                        </>
                    )}
                    {step === 'style' && (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight text-white/90">{t('headers.style')}</h1>
                            <p className="text-gray-500 text-sm">{t('headers.styleDesc', { world_context: 'world_context' })}</p>
                        </>
                    )}
                    {step === 'role' && (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight text-white/90">{t('headers.role')}</h1>
                            <p className="text-gray-500 text-sm">{t('headers.roleDesc')}</p>
                        </>
                    )}
                    {step === 'analyzing' && (<div className='h-16'></div>)}
                </div>

                {/* Main Card */}
                <div className="bg-[#0f0b15] border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">

                    {/* Inner Content Padding */}
                    <div className="p-8 pb-32 flex-1 flex flex-col">

                        {step !== 'analyzing' && (
                            <StepIndicator currentStep={getStepNumber(step)} totalSteps={3} />
                        )}

                        <div className="flex-1 flex flex-col justify-center relative">
                            <AnimatePresence custom={direction} mode="wait">
                                {step === 'concept' && renderConceptStep()}
                                {step !== 'concept' && renderOtherSteps()}
                            </AnimatePresence>
                        </div>
                    </div>
                    <ProcessingOverlay
                        isVisible={isGenerating}
                        title={t('toasts.createdTitle')}
                        description={t('toasts.createdDesc', { name, role: currentArchetype?.title })}
                    />

                    {/* Footer / Actions */}
                    {
                        step !== 'analyzing' && (
                            <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-white/5 bg-[#0f0b15]/50 backdrop-blur-sm flex justify-between items-center">
                                {/* Back Button or Divider */}
                                <div>
                                    {step !== 'concept' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (step === 'style') handlePrevStep('concept');
                                                if (step === 'role') handlePrevStep('style');
                                            }}
                                            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2 pl-0 hover:pl-2 transition-all"
                                        >
                                            <MoveLeft size={16} /> {t('buttons.back')}
                                        </Button>
                                    )}
                                </div>

                                {/* Next Button */}
                                <div>
                                    {step === 'concept' && (
                                        <Button
                                            onClick={handleConceptSubmit}
                                            disabled={!name.trim()}
                                            variant="dark"
                                            size="xl"
                                            className="w-32"
                                        >
                                            Next <MoveRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    )}
                                    {step === 'style' && (
                                        <Button
                                            onClick={handleStyleSubmit}
                                            disabled={personalityTypes.length === 0}
                                            variant="glow"
                                            size="xl"
                                            className="w-32"
                                        >
                                            Next <MoveRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    )}
                                    {step === 'role' && (
                                        <Button
                                            onClick={handleFinalize}
                                            disabled={isGenerating}
                                            variant="glow"
                                            size="xl"
                                        >
                                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 w-4 h-4" />}
                                            {t('buttons.create')}
                                        </Button>
                                    )}
                                    {/* Placeholders for buttons of other steps */}
                                </div>
                            </div>
                        )
                    }
                </div >
            </main >
        </div >
    );
}
