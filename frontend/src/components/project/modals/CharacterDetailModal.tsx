'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Sparkles, User, Tag, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// Redefine interface locally to match ProjectHome structure
interface Character {
    id?: string;
    name: string;
    description?: string;
    profile_image_url?: string;
    default_mood?: string | string[];
    sheet_status?: 'pending' | 'processing' | 'completed' | 'failed';
    appearance_tags?: string[];
    profile?: {
        age?: string;
        personality?: string;
        pros?: string[];
        cons?: string[];
        background?: string;
        features?: string[];
    };
}

interface CharacterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character | null;
    onRetry?: (characterId: string) => void;
}

export default function CharacterDetailModal({ isOpen, onClose, character, onRetry }: CharacterDetailModalProps) {
    if (!character) return null;

    const isGenerating = character.sheet_status === 'pending' || character.sheet_status === 'processing';
    const isFailed = character.sheet_status === 'failed';

    const moodDisplay = Array.isArray(character.default_mood)
        ? character.default_mood.join(", ")
        : (character.default_mood || "Neutral");

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent hideCloseButton className="max-w-4xl p-0 overflow-hidden bg-[#13111C] border border-white/10 text-white sm:rounded-2xl">
                <div className="flex flex-col md:flex-row h-full max-h-[85vh]">

                    {/* Left: Image / Status Area */}
                    <div className="w-full md:w-1/2 relative bg-black/40 min-h-[400px] md:min-h-full flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
                        {character.profile_image_url && !isGenerating ? (
                            <div
                                className="absolute inset-0 bg-contain bg-no-repeat bg-center"
                                style={{ backgroundImage: `url("${character.profile_image_url}")` }}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 p-8 text-center relative z-10">
                                {isGenerating ? (
                                    <>
                                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-xl shadow-primary/20" />
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-xl font-bold text-white animate-pulse">Designing {character.name}...</h3>
                                            <p className="text-sm text-gray-400">Our AI artists are sketching your character.</p>
                                        </div>
                                    </>
                                ) : isFailed ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                                            <X size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Generation Failed</h3>
                                        <p className="text-sm text-gray-400 max-w-xs mb-4">Something went wrong while creating the character.</p>
                                        {onRetry && (
                                            <Button
                                                onClick={() => onRetry(character.id!)}
                                                className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20"
                                            >
                                                <Sparkles size={16} className="mr-2" /> Retry Generation
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    // Fallback for no image but not generating (shouldn't happen often)
                                    <div className="text-6xl font-bold text-white/10 select-none">
                                        {character.name[0]}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Overlay Gradient for readability if needed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#13111C] via-transparent to-transparent opacity-60" />
                    </div>

                    {/* Right: Details */}
                    <div className="w-full md:w-1/2 flex flex-col bg-[#13111C]">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">
                                    {character.name}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border",
                                        isGenerating
                                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse"
                                            : isFailed
                                                ? "bg-red-500/20 text-red-300 border-red-500/30"
                                                : "bg-green-500/20 text-green-300 border-green-500/30"
                                    )}>
                                        {isGenerating ? "Processing" : isFailed ? "Error" : "Ready"}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full -mr-2 -mt-2"
                            >
                                <X size={20} />
                            </Button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">

                            {/* Basic Info Row */}
                            {(character.profile?.age || character.profile?.personality) && (
                                <section className="grid grid-cols-2 gap-4">
                                    {character.profile?.age && (
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Age</h4>
                                            <p className="text-white font-medium">{character.profile.age}</p>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Moods / Personality */}
                            <section>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles size={12} /> Personality & Mood
                                </h4>
                                <div className="flex flex-col gap-3">
                                    {character.profile?.personality && (
                                        <p className="text-sm text-gray-300 italic">
                                            "{character.profile.personality}"
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {moodDisplay.split(", ").map((mood, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                                                {mood}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Strengths & Weaknesses */}
                            {(character.profile?.pros || character.profile?.cons) && (
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {character.profile?.pros && (
                                        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                                            <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Strengths</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                                {character.profile.pros.map((p, i) => <li key={i}>{p}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {character.profile?.cons && (
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                            <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Weaknesses</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                                {character.profile.cons.map((p, i) => <li key={i}>{p}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Description / Background */}
                            {(character.profile?.background || character.description) && (
                                <section>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FileText size={12} /> Bio / Description
                                    </h4>
                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap rounded-xl bg-white/[0.03] p-4 border border-white/5">
                                        {character.profile?.background || character.description}
                                    </p>
                                </section>
                            )}

                            {/* Appearance Tags */}
                            {(character.appearance_tags && character.appearance_tags.length > 0) && (
                                <section>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Tag size={12} /> Visual Traits
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {character.appearance_tags.map((tag, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400 text-xs text-center">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose} className="hover:bg-white/5 text-gray-400 hover:text-white">
                                Close
                            </Button>
                            <Button className="bg-[#4a4aff] hover:bg-[#3d3dcc] text-white shadow-lg shadow-blue-900/20">
                                <User size={16} className="mr-2" /> Full Profile
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
