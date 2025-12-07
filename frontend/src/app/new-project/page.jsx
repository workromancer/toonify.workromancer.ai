"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Use environment variable or default. In Next.js client side, use NEXT_PUBLIC_ prefix if needed, 
// but here we might just hardcode or use relative path if proxy is set up.
// Assuming API is at http://localhost:8000/api/v1 based on previous context.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const StepIndicator = ({ currentStep, totalSteps }) => {
    return (
        <div className="w-full relative mb-12">
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#343644] -translate-y-1/2 z-0"></div>
            <div
                className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-[#4B38FE] to-[#6039FE] -translate-y-1/2 z-1 transition-all duration-300 ease-in-out"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>

            <div className="relative z-10 flex justify-between">
                {[...Array(totalSteps)].map((_, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum <= currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center gap-2">
                            <div
                                className={`w-4 h-4 rounded-full transition-colors duration-300 ${isActive ? 'bg-[#6039FE]' : 'bg-[#343644]'} ${isCurrent ? 'ring-4 ring-[#6039FE]/20' : ''}`}
                            ></div>
                            <span className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-[#8A8B93]'}`}>
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

export default function NewProjectSetup() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenreSelect = (genre) => {
        setFormData(prev => ({ ...prev, genre }));
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleAugmentWorldview = async () => {
        if (!formData.worldview) return;
        setLoading(true);
        try {
            // Assuming localStorage has token, verify if auth is handled differently in this app (e.g. cookies)
            // If token is in localStorage:
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            const response = await fetch(`${API_BASE_URL}/projects/worldview/augment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({ description: formData.worldview })
            });

            if (response.ok) {
                const data = await response.json();
                setFormData(prev => ({ ...prev, worldview: data.augmented_worldview }));
            }
        } catch (error) {
            console.error("Augmentation failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            const response = await fetch(`${API_BASE_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    title: formData.title,
                    subtitle: formData.subtitle,
                    genre: formData.genre,
                    worldview: formData.worldview,
                    style_preset: "anime_webtoon"
                })
            });

            if (response.ok) {
                // Navigate to project home or dashboard
                router.push('/dashboard');
            } else {
                console.error("Failed to create project");
            }
        } catch (error) {
            console.error("Error creating project", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#10111A] text-[#e0e0e0] flex items-center justify-center p-4 font-sans">
            <main className="bg-[#1E1F2B] w-full max-w-2xl rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden">

                <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Create a New Project</h1>
                    {step === 1 && <p className="text-[#8A8B93]">Let's start with a catchy title.</p>}
                    {step === 2 && <p className="text-[#8A8B93]">Add a subtitle or tagline.</p>}
                    {step === 3 && <p className="text-[#8A8B93]">What's the genre?</p>}
                    {step === 4 && <p className="text-[#8A8B93]">Tell us about the world.</p>}
                </header>

                <StepIndicator currentStep={step} totalSteps={4} />

                <div className="min-h-[300px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col gap-4"
                            >
                                <label className="block text-sm font-medium text-[#8A8B93] mb-1">Project Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g. The Last Starfighter"
                                    className="w-full bg-[#10111A] border border-[#343644] rounded-lg px-4 py-3 text-white placeholder-[#4B5563] focus:outline-none focus:border-[#6039FE] focus:ring-1 focus:ring-[#6039FE] transition-all"
                                    autoFocus
                                />
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col gap-4"
                            >
                                <label className="block text-sm font-medium text-[#8A8B93] mb-1">Subtitle (Optional)</label>
                                <input
                                    type="text"
                                    name="subtitle"
                                    value={formData.subtitle}
                                    onChange={handleInputChange}
                                    placeholder="e.g. A Tale of Two Galaxies"
                                    className="w-full bg-[#10111A] border border-[#343644] rounded-lg px-4 py-3 text-white placeholder-[#4B5563] focus:outline-none focus:border-[#6039FE] focus:ring-1 focus:ring-[#6039FE] transition-all"
                                    autoFocus
                                />
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {genres.map((g) => (
                                        <button
                                            key={g.label}
                                            onClick={() => handleGenreSelect(g.label)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 ${formData.genre === g.label
                                                    ? 'bg-[#6039FE]/20 border-[#6039FE] text-white'
                                                    : 'bg-[#10111A] border-[#343644] text-[#8A8B93] hover:border-[#6039FE]/50 hover:text-white'
                                                }`}
                                        >
                                            <span className="text-xl">{g.icon}</span>
                                            <span className="font-medium text-sm">{g.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col gap-4"
                            >
                                <label className="block text-sm font-medium text-[#8A8B93] mb-1">Worldview & Key Settings</label>
                                <textarea
                                    name="worldview"
                                    value={formData.worldview}
                                    onChange={handleInputChange}
                                    placeholder="Describe the world, magic system, key rules..."
                                    className="w-full h-40 bg-[#10111A] border border-[#343644] rounded-lg px-4 py-3 text-white placeholder-[#4B5563] focus:outline-none focus:border-[#6039FE] focus:ring-1 focus:ring-[#6039FE] transition-all resize-none"
                                />
                                <button
                                    onClick={handleAugmentWorldview}
                                    disabled={loading || !formData.worldview}
                                    className="self-start text-[#6039FE] text-sm font-medium hover:text-[#4B38FE] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? 'Augmenting...' : '✨ AI Augment Description'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <footer className="mt-8 flex justify-between items-center border-t border-[#343644] pt-6">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${step === 1
                                ? 'text-[#4B5563] cursor-not-allowed'
                                : 'text-[#e0e0e0] hover:bg-[#343644]'
                            }`}
                    >
                        Back
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            className="bg-[#6039FE] hover:bg-[#4B38FE] text-white px-8 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-[#6039FE]/25"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-[#6039FE] hover:bg-[#4B38FE] text-white px-8 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-[#6039FE]/25 disabled:opacity-70 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Creating...
                                </>
                            ) : 'Finish Setup'}
                        </button>
                    )}
                </footer>
            </main>
        </div>
    );
}
