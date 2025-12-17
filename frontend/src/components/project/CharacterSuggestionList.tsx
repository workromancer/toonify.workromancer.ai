import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, UserPlus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CharacterSuggestion {
    id: string;
    project_id: string;
    name: string;
    age: string;
    visual_keywords: string[];
    personality: string;
    bio?: string;
    role?: string;
    is_used: boolean;
}

interface CharacterSuggestionListProps {
    projectId: string;
    onSelect: (suggestion: CharacterSuggestion) => void;
}

export function CharacterSuggestionList({ projectId, onSelect }: CharacterSuggestionListProps) {
    const t = useTranslations('CharacterWizard'); // Resuing wizard translations or add new
    const { toast } = useToast();
    const locale = useLocale();

    const [suggestions, setSuggestions] = useState<CharacterSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/characters/suggestions/${projectId}`);
            setSuggestions(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, [projectId]);

    const handleGenerateBatch = async () => {
        setGenerating(true);
        try {
            const res = await api.post(`/characters/suggestions/batch`, {
                project_id: projectId,
                language: locale
            });
            // Append new suggestions
            if (res.data) {
                setSuggestions(prev => [...res.data, ...prev]);
                toast({
                    title: "Suggestions Ready",
                    description: `Generated ${res.data.length} new character concepts.`,
                });
            }
        } catch (e) {
            console.error(e);
            toast({
                title: "Generation Failed",
                description: "Could not generate suggestions.",
                variant: 'destructive'
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleSelect = async (suggestion: CharacterSuggestion) => {
        // Mark as used
        try {
            await api.post(`/characters/suggestions/${suggestion.id}/use`);
            onSelect(suggestion);
            setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#0f0b15] border-l border-white/5 w-full max-w-sm">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#15121c]">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI Suggestions
                </h3>
                <Badge variant="outline" className="border-white/10 text-gray-400">
                    {suggestions.length} Available
                </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loading && <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin w-6 h-6 mx-auto mb-2" />Loading...</div>}

                {!loading && suggestions.length === 0 && !generating && (
                    <div className="text-center py-8 text-gray-500 space-y-4">
                        <p>No unused suggestions found.</p>
                        <Button onClick={handleGenerateBatch} variant="outline" className="gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                            <Sparkles className="w-4 h-4" /> Generate Batch (5 Credits)
                        </Button>
                    </div>
                )}

                {generating && (
                    <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 animate-pulse flex flex-col gap-3">
                        <div className="h-4 bg-purple-500/10 rounded w-3/4"></div>
                        <div className="h-10 bg-purple-500/5 rounded"></div>
                        <div className="text-center text-xs text-purple-300 mt-2">AI is brainstorming 10 concepts...</div>
                    </div>
                )}

                {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="group bg-[#1c1924] hover:bg-[#252130] border border-white/5 hover:border-purple-500/30 rounded-xl p-4 transition-all duration-200 cursor-pointer relative" onClick={() => handleSelect(suggestion)}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-white text-md group-hover:text-purple-300 transition-colors uppercase tracking-tight">{suggestion.name}</h4>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    <span>Age: {suggestion.age}</span>
                                    <span>•</span>
                                    <span>{suggestion.role || "Unknown Role"}</span>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <UserPlus className="w-4 h-4 text-purple-400" />
                            </Button>
                        </div>

                        <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                            {suggestion.bio || suggestion.personality}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                            {suggestion.visual_keywords?.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] px-1.5 bg-black/20 text-gray-500 border border-white/5">
                                    {tag}
                                </Badge>
                            ))}
                            {(suggestion.visual_keywords?.length || 0) > 3 && (
                                <span className="text-[9px] text-gray-600 self-center">+{suggestion.visual_keywords.length - 3}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-[#15121c]">
                <Button onClick={handleGenerateBatch} disabled={generating} className="w-full gap-2 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 border border-white/10">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {generating ? "Generating..." : "Generate New Batch"}
                </Button>
            </div>
        </div>
    );
}

export default CharacterSuggestionList;
