'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CarouselOption {
    id: string;
    title: string;
    description: string;
    content: string;
    tone?: string;
    key_features?: string[];
}

interface WorldviewCarouselProps {
    options: any[];
    onSelect: (option: any) => void;
    onDismiss: () => void;
}

export function WorldviewCarousel({ options, onSelect, onDismiss }: WorldviewCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % options.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + options.length) % options.length);
    };

    const currentOption = options[currentIndex];

    const handleDismiss = () => {
        onDismiss();
    };

    // Safety check if options are empty
    if (!options || options.length === 0) return null;

    const handleSelect = () => {
        onSelect(options[currentIndex].content);
    };

    return (
        <div className="relative w-full overflow-hidden bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-700 p-6 min-h-[400px] flex flex-col justify-between shadow-2xl">
            {/* Header / Title of current card */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-black text-white tracking-wide">{options[currentIndex].title}</h3>
                    {options[currentIndex].tone && (
                        <span className="text-xs uppercase tracking-wider font-bold text-primary/80">
                            {options[currentIndex].tone}
                        </span>
                    )}
                </div>
                <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                    {currentIndex + 1} / {options.length}
                </span>
            </div>

            {/* Content Preview */}
            <div className="flex-1 mb-6 flex flex-col gap-4">
                <p className="text-sm text-gray-300 italic border-l-2 border-primary/50 pl-3">
                    "{currentOption.description}"
                </p>

                {currentOption.key_features && currentOption.key_features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {currentOption.key_features.map((feature: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-1 rounded-md border border-gray-700">
                                {feature}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto text-sm text-gray-400 bg-black/40 p-4 rounded-lg border border-white/5 leading-relaxed">
                    {currentOption.content}
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handlePrev} className="text-gray-400 hover:text-white">
                    <ChevronLeft size={24} />
                </Button>

                <div className="flex gap-3 flex-1">
                    <Button variant="outline" onClick={handleDismiss} className="flex-1 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800">
                        Dismiss
                    </Button>

                    <Button onClick={() => onSelect(currentOption)} className="flex-1 bg-primary text-white hover:bg-primary/90">
                        Select & Create Project <Check size={16} className="ml-2" />
                    </Button>
                </div>

                <Button variant="ghost" size="icon" onClick={handleNext} className="text-gray-400 hover:text-white">
                    <ChevronRight size={24} />
                </Button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {options.map((_, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors",
                            idx === currentIndex ? "bg-primary" : "bg-gray-700"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
