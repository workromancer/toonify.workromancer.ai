'use client';

import { Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Suggestion {
    id: string;
    name: string;
    role?: string;
    theme_color?: string;
    bio?: string;
    personality?: string;
    stats?: Record<string, number>;
    visual_keywords?: string[];
    age?: string;
    personality_tags?: string[];
}

interface SuggestionCardProps {
    suggestion: Suggestion;
    onClick: () => void;
    onReject?: (e: React.MouseEvent) => void;
    isPromoting?: boolean;
    className?: string;
}

export default function SuggestionCard({
    suggestion,
    onClick,
    onReject,
    isPromoting = false,
    className,
}: SuggestionCardProps) {
    return (
        <div
            onClick={isPromoting ? undefined : onClick}
            className={cn(
                "group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#15121c] border border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col p-2 sm:p-3",
                isPromoting 
                    ? "cursor-wait opacity-70 border-purple-500/50" 
                    : "cursor-pointer",
                className
            )}
            style={{ borderTop: suggestion.theme_color ? `3px solid ${suggestion.theme_color}` : undefined }}
        >
            {/* Promoting Overlay */}
            {isPromoting && (
                <div className="absolute inset-0 z-30 bg-purple-900/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider animate-pulse">Casting...</span>
                </div>
            )}

            {/* Reject Button - Only show if onReject is provided and not promoting */}
            {onReject && !isPromoting && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onReject(e);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors z-20 opacity-0 group-hover:opacity-100"
                >
                    <X size={14} />
                </button>
            )}

            <div className="flex-1 flex flex-col justify-center items-center gap-1">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-white text-[10px] font-bold uppercase tracking-tight text-center">
                    {suggestion.name}
                </h4>
                <p className="text-[9px] text-purple-300/70 font-medium">
                    {suggestion.role || "Potential Cast"}
                </p>
            </div>
            <div className="mt-auto pt-2 border-t border-white/5">
                <p className="text-[9px] text-gray-500 line-clamp-2 leading-tight italic">
                    "{suggestion.bio || suggestion.personality}"
                </p>
            </div>
        </div>
    );
}

