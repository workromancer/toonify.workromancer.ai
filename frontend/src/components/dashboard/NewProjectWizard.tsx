'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, MoveRight, MoveLeft, Sparkles, AlertCircle, Wand2 } from 'lucide-react';
import { WorldviewCarousel } from '@/components/ui/carousel-custom';

const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    return (
        <div className="w-full relative mb-12">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 z-0"></div>
            <motion.div
                className="absolute top-1/2 left-0 h-[1px] bg-primary -translate-y-1/2 z-1 shadow-[0_0_10px_rgba(55,19,236,0.6)]"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />

            <div className="relative z-10 flex justify-between">
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
                                "text-[10px] uppercase tracking-widest font-bold transition-all duration-300 absolute -bottom-8 w-24 text-center",
                                isActive ? "text-white opacity-100" : "text-gray-500 opacity-0 group-hover:opacity-50"
                            )}>
                                {stepNum === 1 && 'Title'}
                                {stepNum === 2 && 'Subtitle'}
                                {stepNum === 3 && 'Genre'}
                                {stepNum === 4 && 'World'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function NewProjectWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<{
        title: string;
        subtitle: string;
        genre: string[];
        worldview: string | any;
    }>({
        title: '',
        subtitle: '',
        genre: [],
        worldview: ''
    });
    const [augmentOptions, setAugmentOptions] = useState<any[]>([]);

    const genres = [
        { label: 'Fantasy', icon: '🧙' },
        { label: 'Romance', icon: '❤️' },
        { label: 'Sci-Fi', icon: '🤖' },
        { label: 'Slice of Life', icon: '🍰' },
        { label: 'Action', icon: '💥' },
        { label: 'Thriller', icon: '🔪' },
        { label: 'Historical', icon: '📜' },
        { label: 'Comedy', icon: '😂' },
        { label: 'Drama', icon: '🎭' },
        { label: 'Mystery', icon: '🕵️' },
        { label: 'Horror', icon: '👻' },
        { label: 'Sports', icon: '⚽' },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenreSelect = (genre: string) => {
        setFormData(prev => {
            const currentGenres = prev.genre;
            if (currentGenres.includes(genre)) {
                return { ...prev, genre: currentGenres.filter(g => g !== genre) };
            } else {
                return { ...prev, genre: [...currentGenres, genre] };
            }
        });
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleAugmentWorldview = async () => {
        setLoading(true);
        setError('');
        setAugmentOptions([]);
        try {
            const desc = typeof formData.worldview === 'string' ? formData.worldview : formData.worldview.content || JSON.stringify(formData.worldview);

            const response = await api.post('/projects/worldview/augment', {
                description: desc,
                title: formData.title,
                subtitle: formData.subtitle,
                genres: formData.genre
            });

            if (response.data.options) {
                setAugmentOptions(response.data.options);
            } else if (response.data.augmented_worldview) {
                setFormData(prev => ({ ...prev, worldview: response.data.augmented_worldview }));
            }
        } catch (error: any) {
            console.error("Augmentation failed", error);
            setError("Failed to augment worldview. Please check API Key configuration.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAugmentedOption = async (option: any) => {
        const finalWorldview = {
            ...option,
            meta_type: "augmented_v1"
        };
        setFormData(prev => ({ ...prev, worldview: finalWorldview }));
        await submitProject({ ...formData, worldview: finalWorldview });
    };

    const submitProject = async (data: typeof formData) => {
        setLoading(true);
        setError('');
        try {
            let finalWorldview = data.worldview;
            if (typeof finalWorldview === 'string') {
                finalWorldview = {
                    title: data.title + " World",
                    content: finalWorldview,
                    tone: "General",
                    key_features: []
                };
            }

            const response = await api.post('/projects/', {
                title: data.title,
                subtitle: data.subtitle,
                genre: data.genre.join(', '),
                worldview: finalWorldview,
                style_preset: "anime_webtoon"
            });
            // Redirect to project page with setup=true to trigger Art Style modal
            router.push(`/project/${response.data.id}?setup=true`);
        } catch (error: any) {
            console.error("Error creating project", error);
            const msg = error.response?.data?.detail
                ? (typeof error.response.data.detail === 'object' ? JSON.stringify(error.response.data.detail) : error.response.data.detail)
                : error.message;
            setError(`Failed: ${msg}`);
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        submitProject(formData);
    };

    const stepVariants = {
        hidden: (direction: number) => ({
            opacity: 0,
            x: direction > 0 ? 30 : -30,
            scale: 0.95
        }),
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 30 } as any
        },
        exit: (direction: number) => ({
            opacity: 0,
            x: direction < 0 ? 30 : -30,
            scale: 0.95,
            transition: { duration: 0.2 } as any
        })
    };

    const [direction, setDirection] = useState(0);

    const handleNext = () => {
        setDirection(1);
        nextStep();
    };

    const handlePrev = () => {
        setDirection(-1);
        prevStep();
    };

    return (
        <div className="min-h-screen bg-background-dark text-white flex items-center justify-center p-4 font-display overflow-y-auto relative">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

            <main className="w-full max-w-3xl relative z-10 flex flex-col min-h-[600px]">

                {/* Header Section with Glass effect */}
                <div className="mb-8 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-4xl font-black tracking-tight text-white mb-3">
                        {step === 1 && 'Name Your Story'}
                        {step === 2 && 'Add a Tagline'}
                        {step === 3 && 'Choose Genre'}
                        {step === 4 && 'Build the World'}
                    </h1>
                    <p className="text-gray-400 text-lg font-light">
                        {step === 1 && 'Every great webtoon starts with a memorable title.'}
                        {step === 2 && 'Give your readers a hint of what\'s coming.'}
                        {step === 3 && 'Select one or more genres that fit your story.'}
                        {step === 4 && 'Describe the setting and let AI enhance it for you.'}
                    </p>
                </div>

                {/* Main Content Card */}
                <div className="bg-[#1a1726]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8 md:p-12 flex-1 flex flex-col relative overflow-hidden">

                    <StepIndicator currentStep={step} totalSteps={4} />

                    <div className="flex-1 flex flex-col justify-center relative">
                        <AnimatePresence custom={direction} mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    custom={direction}
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col gap-6"
                                >
                                    <Input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="Enter title here..."
                                        className="h-20 text-3xl font-bold bg-black/20 border-white/10 focus-visible:ring-primary focus-visible:border-primary/50 text-white placeholder:text-white/20 rounded-xl px-6"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && formData.title) {
                                                e.preventDefault();
                                                handleNext();
                                            }
                                        }}
                                    />
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    custom={direction}
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col gap-6"
                                >
                                    <Input
                                        name="subtitle"
                                        value={formData.subtitle}
                                        onChange={handleInputChange}
                                        placeholder="Enter subtitle (optional)..."
                                        className="h-16 text-xl bg-black/20 border-white/10 focus-visible:ring-primary focus-visible:border-primary/50 text-white placeholder:text-white/20 rounded-xl px-6"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleNext();
                                            }
                                        }}
                                    />
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    custom={direction}
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="h-full"
                                >
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {genres.map((g) => (
                                            <button
                                                key={g.label}
                                                onClick={() => handleGenreSelect(g.label)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-4 rounded-xl border transition-all duration-200 text-left group relative overflow-hidden",
                                                    formData.genre.includes(g.label)
                                                        ? "bg-primary border-primary text-white shadow-[0_0_20px_rgba(55,19,236,0.4)]"
                                                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white"
                                                )}
                                            >
                                                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{g.icon}</span>
                                                <span className="font-bold text-sm">{g.label}</span>
                                                {formData.genre.includes(g.label) && (
                                                    <motion.div
                                                        layoutId="genre-check"
                                                        className="absolute right-2 top-2 text-white/50"
                                                    >
                                                        <Check size={14} />
                                                    </motion.div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    custom={direction}
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col gap-4 h-full"
                                >
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Project Worldview</h3>
                                            <p className="text-xs text-gray-500">Describe your setting for better AI results.</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={handleAugmentWorldview}
                                            disabled={loading}
                                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/20 gap-2 font-bold px-4 h-9"
                                        >
                                            {loading ? <span className="animate-spin"><Wand2 size={16} /></span> : <Sparkles size={16} />}
                                            AI Augment
                                        </Button>
                                    </div>

                                    <Textarea
                                        name="worldview"
                                        value={typeof formData.worldview === 'string' ? formData.worldview : (formData.worldview.content || '')}
                                        onChange={handleInputChange}
                                        placeholder="E.g. A dystopian cyberpunk city where rain never stops and neon lights control people's emotions..."
                                        className="flex-1 min-h-[150px] bg-black/20 border-white/10 focus-visible:ring-primary focus-visible:border-primary/50 text-white placeholder:text-white/20 resize-none text-base leading-relaxed p-6 rounded-xl"
                                    />

                                    {augmentOptions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4"
                                        >
                                            <div className="flex justify-between items-center mb-3 px-1">
                                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">AI Suggestions</span>
                                                <button
                                                    onClick={() => setAugmentOptions([])}
                                                    className="text-xs text-gray-500 hover:text-white transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                            <WorldviewCarousel
                                                options={augmentOptions}
                                                onSelect={handleSelectAugmentedOption}
                                                onDismiss={() => setAugmentOptions([])}
                                            />
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-3"
                        >
                            <AlertCircle size={18} className="text-red-500" />
                            {error}
                        </motion.div>
                    )}

                    <footer className="mt-12 flex justify-between items-center pt-8 border-t border-white/5">
                        <Button
                            variant="ghost"
                            onClick={handlePrev}
                            disabled={step === 1 || loading}
                            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
                        >
                            <MoveLeft size={16} /> Back
                        </Button>

                        <Button
                            onClick={step < 4 ? handleNext : handleSubmit}
                            disabled={loading || (step === 1 && !formData.title)}
                            className={cn(
                                "min-w-[140px] h-14 rounded-xl text-base font-bold shadow-xl gap-2 transition-all duration-300",
                                step === 4 ? "bg-green-600 hover:bg-green-500 shadow-green-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20",
                                loading && "opacity-80 scale-95"
                            )}
                        >
                            {loading ? (
                                'Processing...'
                            ) : step < 4 ? (
                                <>Next <MoveRight size={18} /></>
                            ) : (
                                <>Create Project <Check size={18} /></>
                            )}
                        </Button>
                    </footer>
                </div>
            </main>
        </div>
    );
}
