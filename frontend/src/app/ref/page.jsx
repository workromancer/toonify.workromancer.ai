'use client'

import React, { useState, useEffect } from 'react';
import {
    X, Sparkles, Zap, ChevronRight, LayoutList,
    RotateCw, Check, FileText, Film, ArrowLeft,
    Wand2, Calendar, Clock, Plus, MoreVertical,
    Sliders
} from 'lucide-react';

/**
 * EPISODE GENERATOR UI
 * * Concept: Modal UI for creating new webtoon episodes with AI assistance
 * * Features: AI Plot Suggestions, Cut Control, Generation Simulation
 */

// --- Mock Data: AI Suggestions ---
const AI_IDEAS = [
    {
        id: 1,
        title: "Legacy Code: The Undead Project",
        summary: "An intern accidentally unearths a project canceled in the early 2000s, causing 'Spaghetti Code Skeletons' to rise and entangle the office. The Protagonist must perform a 'Refactoring Ritual' to put them to rest.",
        cuts: 12
    },
    {
        id: 2,
        title: "Raid: The Infinite BBQ of Doom",
        summary: "The team is dragged into a mandatory company dinner (Hoesik) which manifests as a Gluttony Dungeon. The Department Head casts 'Toast of Forced Unity', draining everyone's Stamina. The Protagonist must survive until the subway closes.",
        cuts: 18
    },
    {
        id: 3,
        title: "The Monday Morning Curse",
        summary: "A massive area-of-effect debuff hits the district at 9:00 AM Monday, inflicting 'Mass Paralysis' and 'Blue Screen of the Soul' on all workers. Only the Protagonist's 'Caffeine Overdrive' passive skill keeps them moving.",
        cuts: 8
    }
];

// --- Components ---

const EpisodeCard = ({ ep, index }) => (
    <div className="flex items-center justify-between p-4 bg-[#0f0f16] border border-slate-800 rounded-xl mb-3 group hover:border-slate-700 transition-all">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-slate-600 font-mono font-bold text-lg border border-slate-800">
                {ep.number}
            </div>
            <div>
                <h4 className="text-white font-bold text-sm mb-1">{ep.title}</h4>
                <div className="flex gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {ep.date}</span>
                    <span className="flex items-center gap-1"><Film size={10} /> {ep.cuts} Cuts</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded-full border ${ep.status === 'Published' ? 'bg-green-900/20 text-green-400 border-green-500/30' :
                    ep.status === 'Draft' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-purple-900/20 text-purple-400 border-purple-500/30'
                }`}>
                {ep.status}
            </span>
            <button className="p-2 text-slate-500 hover:text-white"><MoreVertical size={16} /></button>
        </div>
    </div>
);

// --- Main Application ---

export default function EpisodeGenerator() {
    const [isModalOpen, setIsModalOpen] = useState(true); // Default open for demo
    const [mode, setMode] = useState('form'); // form, suggestions, generating
    const [loadingStep, setLoadingStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        cuts: 6
    });

    // Episode List (Background)
    const [episodes, setEpisodes] = useState([
        { number: '03', title: "Critical Error: Imp Infestation", date: "2025.12.10", cuts: 45, status: "Draft" },
        { number: '02', title: "The Server Room Dungeon", date: "2025.12.03", cuts: 62, status: "Published" },
        { number: '01', title: "Awakening at 9 AM", date: "2025.11.28", cuts: 58, status: "Published" },
    ]);

    // Handlers
    const handleSuggestionClick = (idea) => {
        setFormData({
            title: idea.title,
            summary: idea.summary,
            cuts: idea.cuts
        });
        setMode('form');
    };

    const handleGenerate = () => {
        setMode('generating');
        // Simulate generation steps
        const steps = [
            "Analyzing Story Arc...",
            "Generating Storyboard Layout...",
            "Drafting Scene #1...",
            "Drafting Scene #2...",
            "Finalizing Cuts..."
        ];

        let current = 0;
        const interval = setInterval(() => {
            setLoadingStep(current);
            current++;
            if (current >= steps.length) {
                clearInterval(interval);
                setTimeout(() => {
                    // Finish
                    const newEp = {
                        number: '04',
                        title: formData.title,
                        date: new Date().toLocaleDateString(),
                        cuts: formData.cuts,
                        status: "Generating"
                    };
                    setEpisodes([newEp, ...episodes]);
                    setIsModalOpen(false);
                    setMode('form');
                }, 800);
            }
        }, 800);
    };

    return (
        <div className="flex h-screen w-full bg-[#05050a] text-slate-200 font-sans overflow-hidden selection:bg-purple-500/30 relative">

            {/* --- BACKGROUND CONTENT (Blurred) --- */}
            <div className={`flex-1 flex flex-col p-8 transition-all duration-500 ${isModalOpen ? 'blur-sm scale-[0.98] opacity-50 pointer-events-none' : ''}`}>
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">워크로맨서 (Workromancer)</h1>
                        <p className="text-slate-500">Season 1 • Urban Fantasy • Ongoing</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                        <Plus size={20} /> New Episode
                    </button>
                </header>

                <div className="grid grid-cols-3 gap-8 h-full">
                    {/* Episode List */}
                    <div className="col-span-2">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            Episodes <span className="text-slate-500 text-sm font-normal">{episodes.length}</span>
                        </h2>
                        {episodes.map((ep, idx) => (
                            <EpisodeCard key={idx} ep={ep} index={idx} />
                        ))}
                    </div>
                    {/* Sidebar Info */}
                    <div className="col-span-1 space-y-6">
                        <div className="bg-[#0f0f16] border border-slate-800 rounded-xl p-6 h-64">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Project Stats</h3>
                            {/* Placeholder for charts */}
                            <div className="flex items-end justify-between h-32 gap-2">
                                {[40, 65, 45, 80, 55, 70].map((h, i) => (
                                    <div key={i} className="w-full bg-slate-800 rounded-t-sm hover:bg-purple-500/50 transition-colors" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- GENERATION MODAL --- */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
                    <div className="w-full max-w-2xl bg-[#0f0f16] border border-slate-700/50 rounded-2xl shadow-2xl shadow-purple-900/20 overflow-hidden flex flex-col max-h-[85vh] relative animate-fade-in-up">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0f0f16] z-10">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {mode === 'generating' ? <RotateCw className="animate-spin text-purple-500" /> : <Sparkles className="text-purple-500" />}
                                    {mode === 'generating' ? 'Creating Episode...' : 'Generate New Episode'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    {mode === 'generating' ? 'AI is converting your summary into storyboard cuts.' : 'Create a new episode from scratch or use AI suggestions.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                                disabled={mode === 'generating'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar relative flex-1">

                            {/* MODE: GENERATING */}
                            {mode === 'generating' ? (
                                <div className="h-full flex flex-col items-center justify-center py-10">
                                    <div className="w-20 h-20 relative mb-8">
                                        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Zap size={24} className="text-white animate-pulse" fill="currentColor" />
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-2 text-center">Thinking...</h3>
                                    <div className="h-6 overflow-hidden relative w-full max-w-xs text-center">
                                        <p key={loadingStep} className="text-slate-400 text-sm animate-fade-in-up">
                                            {["Analyzing Story Arc...", "Drafting Storyboard...", "Generating Cuts...", "Applying Style...", "Finalizing..."][loadingStep]}
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
                                                    <h4 className="text-sm font-bold text-purple-200">Need inspiration?</h4>
                                                    <p className="text-xs text-purple-400/70">Let AI suggest plot twists for this episode.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setMode('suggestions')}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2"
                                            >
                                                <Sparkles size={14} /> Suggest Ideas
                                            </button>
                                        </div>
                                    )}

                                    {/* Suggestions List */}
                                    {mode === 'suggestions' && (
                                        <div className="space-y-3 animate-fade-in">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Suggestions</span>
                                                <button onClick={() => setMode('form')} className="text-xs text-slate-500 hover:text-white underline">Cancel</button>
                                            </div>
                                            {AI_IDEAS.map((idea) => (
                                                <button
                                                    key={idea.id}
                                                    onClick={() => handleSuggestionClick(idea)}
                                                    className="w-full text-left p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-purple-900/10 transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-slate-200 group-hover:text-white">{idea.title}</h4>
                                                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{idea.cuts} Cuts</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">{idea.summary}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Main Form */}
                                    {mode === 'form' && (
                                        <div className="space-y-5 animate-fade-in">
                                            <div>
                                                <label className="text-xs font-mono text-slate-500 mb-1.5 block ml-1 uppercase">Episode Title</label>
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
                                                <label className="text-xs font-mono text-slate-500 mb-1.5 block ml-1 uppercase">Story Summary</label>
                                                <textarea
                                                    placeholder="Describe what happens in this episode. AI will generate storyboard scenes based on this text..."
                                                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-slate-600 resize-none leading-relaxed text-sm"
                                                    value={formData.summary}
                                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-mono text-slate-500 mb-1.5 block ml-1 uppercase">Estimated Cuts</label>
                                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                                                    <Sliders size={18} className="text-slate-500" />
                                                    <input
                                                        type="range"
                                                        min="4" max="60"
                                                        value={formData.cuts}
                                                        onChange={(e) => setFormData({ ...formData, cuts: parseInt(e.target.value) })}
                                                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                    <div className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center font-mono text-sm text-white">
                                                        {formData.cuts}
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
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                                disabled={mode === 'generating'}
                            >
                                Cancel
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
                                {mode === 'generating' ? 'Generating...' : 'Start Generation'}
                                {!mode.includes('generating') && <Zap size={16} fill="currentColor" />}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}