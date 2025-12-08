'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, MoveRight, MoveLeft, Sparkles, AlertCircle } from 'lucide-react';

const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    return (
        <div className="w-full relative mb-12">
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-800 -translate-y-1/2 z-0"></div>
            <motion.div
                className="absolute top-1/2 left-0 h-[2px] bg-primary -translate-y-1/2 z-1"
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
                        <div key={index} className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    "w-4 h-4 rounded-full transition-all duration-300 border-2",
                                    isActive ? "bg-primary border-primary" : "bg-gray-800 border-gray-600",
                                    isCurrent && "ring-4 ring-primary/20 scale-110"
                                )}
                            ></div>
                            <span className={cn(
                                "text-xs font-bold transition-colors duration-300 absolute -bottom-6 w-24 text-center",
                                isActive ? "text-white" : "text-gray-400"
                            )}>
                                {stepNum === 1 && 'Title'}
                                {stepNum === 2 && 'Subtitle'}
                                {stepNum === 3 && 'Genre'}
                                {stepNum === 4 && 'Worldview'}
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
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        genre: '',
        worldview: ''
    });

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
        setFormData(prev => ({ ...prev, genre }));
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleAugmentWorldview = async () => {
        if (!formData.worldview) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/projects/worldview/augment', {
                description: formData.worldview
            });
            setFormData(prev => ({ ...prev, worldview: response.data.augmented_worldview }));
        } catch (error) {
            console.error("Augmentation failed", error);
            setError("Failed to augment worldview. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            await api.post('/projects/', {
                title: formData.title,
                subtitle: formData.subtitle,
                genre: formData.genre,
                worldview: formData.worldview,
                style_preset: "anime_webtoon"
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error creating project", error);
            setError("Failed to create project.");
        } finally {
            setLoading(false);
        }
    };

    const stepVariants = {
        hidden: (direction: number) => ({
            opacity: 0,
            x: direction > 0 ? 50 : -50
        }),
        visible: {
            opacity: 1,
            x: 0,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        },
        exit: (direction: number) => ({
            opacity: 0,
            x: direction < 0 ? 50 : -50,
            transition: { duration: 0.2 }
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
        <div className="min-h-screen bg-background-dark text-white flex items-center justify-center p-4 font-display">
            {/* Background elements if needed */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full translate-y-[-50%]"></div>
            </div>

            <main className="bg-[#1a1726] border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden z-10 flex flex-col min-h-[600px]">

                <header className="text-center mb-10">
                    <h1 className="text-3xl font-black tracking-tight text-white mb-2">Create New Project</h1>
                    <p className="text-gray-400 text-lg">
                        {step === 1 && 'Let\'s start with a catchy title.'}
                        {step === 2 && 'Add a subtitle or tagline.'}
                        {step === 3 && 'What\'s the genre?'}
                        {step === 4 && 'Tell us about the world.'}
                    </p>
                </header>

                <StepIndicator currentStep={step} totalSteps={4} />

                <div className="flex-1 flex flex-col justify-center">
                    <AnimatePresence custom={direction} mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                custom={direction}
                                variants={stepVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex flex-col gap-4"
                            >
                                <label className="block text-sm font-bold text-gray-300">Project Title</label>
                                <Input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g. The Last Starfighter"
                                    className="h-14 text-lg bg-background-dark border-gray-600 focus-visible:ring-primary text-white placeholder:text-gray-500"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && formData.title && handleNext()}
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
                                className="flex flex-col gap-4"
                            >
                                <label className="block text-sm font-bold text-gray-300">Subtitle (Optional)</label>
                                <Input
                                    name="subtitle"
                                    value={formData.subtitle}
                                    onChange={handleInputChange}
                                    placeholder="e.g. A Tale of Two Galaxies"
                                    className="h-14 text-lg bg-background-dark border-gray-600 focus-visible:ring-primary text-white placeholder:text-gray-500"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
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
                                                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left group",
                                                formData.genre === g.label
                                                    ? "bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(55,19,236,0.3)]"
                                                    : "bg-background-dark border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white hover:bg-gray-800/80"
                                            )}
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition-transform">{g.icon}</span>
                                            <span className="font-bold text-sm">{g.label}</span>
                                            {formData.genre === g.label && <Check size={16} className="ml-auto text-primary" />}
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
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-bold text-gray-300">Worldview & Key Settings</label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAugmentWorldview}
                                        disabled={loading || !formData.worldview}
                                        className="text-primary hover:text-primary/80 hover:bg-primary/10 gap-2 h-8"
                                    >
                                        {loading ? <span className="animate-spin">✨</span> : <Sparkles size={14} />}
                                        AI Augment
                                    </Button>
                                </div>
                                <Textarea
                                    name="worldview"
                                    value={formData.worldview}
                                    onChange={handleInputChange}
                                    placeholder="Describe the world, magic system, key rules..."
                                    className="flex-1 min-h-[200px] bg-background-dark border-gray-600 focus-visible:ring-primary text-white placeholder:text-gray-500 resize-none text-base leading-relaxed p-4"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <footer className="mt-10 flex justify-between items-center pt-6 border-t border-gray-800">
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
                        className="bg-primary hover:bg-primary/90 text-white min-w-[120px] h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 gap-2"
                    >
                        {loading ? (
                            'Processing...'
                        ) : step < 4 ? (
                            <>Next <MoveRight size={18} /></>
                        ) : (
                            <>Finish Setup <Check size={18} /></>
                        )}
                    </Button>
                </footer>
            </main>
        </div>
    );
}
