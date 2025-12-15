'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sparkles, Zap, RotateCw, Wand2, Sliders } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface GenerateEpisodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onGenerate: (newEpisode: any) => void;
    nextOrder: number;
}

interface Idea {
    title: string;
    summary: string;
    reason: string;
    cuts?: number;
}

export default function GenerateEpisodeModal({ isOpen, onClose, projectId, onGenerate, nextOrder }: GenerateEpisodeModalProps) {
    const t = useTranslations('Modals.GenerateEpisode');
    const [mode, setMode] = useState<'form' | 'suggestions' | 'generating'>('form');
    const [loadingStep, setLoadingStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        story_summary: '',
        num_cuts: 6
    });

    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loadingIdeas, setLoadingIdeas] = useState(false);
    const { toast } = useToast();

    // Reset state when closing
    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setMode('form');
            setLoadingStep(0);
            setIdeas([]);
            setFormData({ title: '', story_summary: '', num_cuts: 6 });
        }, 300);
    };

    const handleSuggestIdeas = async () => {
        setLoadingIdeas(true);
        // We'll temporarily switch to suggestions mode if we have cached ideas, 
        // else we wait for load. 
        // Actually, let's just show loading state in button or switch mode and show loader there.
        // The ref design has a "Need inspiration?" block. 

        try {
            const res = await api.post('/episodes/generate-options', null, { params: { project_id: projectId } });
            if (res.data.options) {
                setIdeas(res.data.options);
                setMode('suggestions');
            }
        } catch (e) {
            console.error("Failed to get ideas", e);
            toast({
                title: t('failed'),
                description: t('failedDesc'),
                variant: "destructive"
            });
        } finally {
            setLoadingIdeas(false);
        }
    };

    const handleSuggestionClick = (idea: Idea) => {
        setFormData({
            ...formData,
            title: idea.title,
            story_summary: idea.summary,
            // If API doesn't return cuts, keep default or random
            num_cuts: idea.cuts || 6
        });
        setMode('form');
    };

    const handleGenerate = async () => {
        setMode('generating');
        setLoadingStep(0);

        // Start animation timer
        // Start animation timer
        const steps = [
            t('steps.analyzing'),
            t('steps.drafting'),
            t('steps.generating'),
            t('steps.applying'),
            t('steps.finalizing')
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            if (currentStep < steps.length) {
                setLoadingStep(currentStep);
            }
        }, 1500); // Slower steps to match real API time roughly

        try {
            console.log("Generating episode with:", formData);
            // Real API Call
            const response = await api.post('/episodes/generate-cuts', {
                project_id: projectId,
                episode_title: formData.title,
                episode_summary: formData.story_summary,
                num_cuts: formData.num_cuts
            });

            clearInterval(interval);
            setLoadingStep(steps.length - 1); // Finished

            // Delay slightly to show "Finalizing"
            setTimeout(() => {
                const newEpisode = {
                    id: response.data.episode_id,
                    title: formData.title,
                    story_summary: formData.story_summary,
                    episode_order: nextOrder,
                    cuts_count: response.data.cuts_count,
                    thumbnail_url: null, // Will be generated later
                    created_at: new Date().toISOString()
                };

                onGenerate(newEpisode);

                toast({
                    title: t('success'),
                    description: t('successDesc', { title: formData.title }),
                });

                handleClose();
            }, 800);

        } catch (error) {
            console.error("Failed to generate episode", error);
            clearInterval(interval);
            setMode('form'); // Go back to form on error
            toast({
                title: t('genFailed'),
                description: t('genFailedDesc'),
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            {/* Custom styled content overriding default Shadcn styles a bit */}
            <DialogContent className="bg-[#0f0f16] border border-slate-700/50 p-0 overflow-hidden sm:max-w-[700px] gap-0 text-slate-200">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0f0f16] z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {mode === 'generating' ? <RotateCw className="animate-spin text-purple-500" /> : <Sparkles className="text-purple-500" />}
                            {mode === 'generating' ? t('titleGenerating') : t('title')}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {mode === 'generating' ? t('descGenerating') : t('desc')}
                        </p>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar relative">

                    {/* MODE: GENERATING */}
                    {mode === 'generating' ? (
                        <div className="h-full flex flex-col items-center justify-center py-10 min-h-[300px]">
                            <div className="w-20 h-20 relative mb-8">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Zap size={24} className="text-white animate-pulse" fill="currentColor" />
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-2 text-center">{t('thinking')}</h3>
                            <div className="h-6 overflow-hidden relative w-full max-w-xs text-center">
                                <p key={loadingStep} className="text-slate-400 text-sm animate-fade-in-up">
                                    {[t('steps.analyzing'), t('steps.drafting'), t('steps.generating'), t('steps.applying'), t('steps.finalizing')][loadingStep] || "Processing..."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* MODE: FORM & SUGGESTIONS */
                        <div className="space-y-6">

                            {/* Suggestion Toggle Area */}
                            {mode === 'form' && (
                                <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
                                            <Wand2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-purple-200">{t('needInspiration')}</h4>
                                            <p className="text-xs text-purple-400/70">{t('inspirationDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSuggestIdeas}
                                        disabled={loadingIdeas}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingIdeas ? <RotateCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        {loadingIdeas ? t('thinking') : t('suggestIdeas')}
                                    </button>
                                </div>
                            )}

                            {/* Suggestions List */}
                            {mode === 'suggestions' && (
                                <div className="space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('suggestionsTitle')}</span>
                                        <button onClick={() => setMode('form')} className="text-xs text-slate-500 hover:text-white underline">{t('cancel')}</button>
                                    </div>
                                    {ideas.map((idea, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSuggestionClick(idea)}
                                            className="w-full text-left p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-purple-900/10 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-200 group-hover:text-white">{idea.title}</h4>
                                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{t('autoCuts')}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">{idea.summary}</p>
                                            <div className="mt-2 text-[10px] text-purple-400/60 italic">Why: {idea.reason}</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Main Form */}
                            {mode === 'form' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div>
                                        <label className="text-xs font-mono text-slate-500 mb-1.5 block ml-1 uppercase">{t('episodeTitleLabel')}</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. The Beginning of the End"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-slate-600"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-mono text-slate-500 mb-1.5 block ml-1 uppercase">{t('summaryLabel')}</label>
                                        <textarea
                                            placeholder={t('summaryPlaceholder')}
                                            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-slate-600 resize-none leading-relaxed text-sm"
                                            value={formData.story_summary}
                                            onChange={(e) => setFormData({ ...formData, story_summary: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-mono text-slate-500 mb-1.5 block ml-1 uppercase">{t('cutsLabel')}</label>
                                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                                            <Sliders size={18} className="text-slate-500" />
                                            <input
                                                type="range"
                                                min="4" max="20"
                                                value={formData.num_cuts}
                                                onChange={(e) => setFormData({ ...formData, num_cuts: parseInt(e.target.value) })}
                                                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                            <div className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center font-mono text-sm text-white">
                                                {formData.num_cuts}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-800 bg-[#0f0f16] flex justify-end gap-3 z-10">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                        disabled={mode === 'generating'}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={mode === 'generating' || !formData.title || (mode === 'suggestions')}
                        className={`
                          px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all
                          ${mode === 'generating' || !formData.title || mode === 'suggestions'
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30 hover:shadow-purple-900/50 hover:translate-y-[-1px]'
                            }
                        `}
                    >
                        {mode === 'generating' ? t('generating') : t('startGen')}
                        {!mode.includes('generating') && <Zap size={16} fill="currentColor" />}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
