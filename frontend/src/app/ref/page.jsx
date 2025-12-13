'use client'

import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutGrid, Paintbrush, LayoutTemplate, FolderOpen, Settings,
    Plus, Search, MoreVertical, LogOut, User,
    HelpCircle, ChevronDown, Sparkles, Wand2,
    Zap, Command, Layers, Trash2, Edit3, Copy, Check, Loader2, Image as ImageIcon
} from 'lucide-react';

/**
 * TOONIFY ART STYLE PAGE (Generation Mode)
 * * Update: Removed Base Model information.
 * * Concept: Creating Art Styles via Prompts
 */

// --- Mock Data ---

const INITIAL_STYLES = [
    {
        id: 1,
        name: "Neon Noir (Cyberpunk)",
        prompt: "cyberpunk city, neon lights, rain, high contrast",
        image: "https://picsum.photos/seed/neon/400/300",
        version: "v2.1",
        status: "Ready"
    },
    {
        id: 2,
        name: "Joseon Dynasty Ink",
        prompt: "traditional korean ink painting, mountains, fog",
        image: "https://picsum.photos/seed/ink/400/300",
        version: "v1.0",
        status: "Ready"
    }
];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, isActive, hasSubMenu }) => (
    <button
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all group relative overflow-hidden ${isActive
                ? 'bg-purple-600/10 text-purple-400 font-bold shadow-[inset_3px_0_0_0_#9333ea]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium'
            }`}
    >
        <Icon size={18} className={`transition-colors ${isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
        <span className="flex-1 text-left leading-none pt-[2px]">{label}</span>
        {hasSubMenu && <ChevronDown size={14} className="opacity-50" />}

        {isActive && (
            <div className="absolute inset-0 bg-purple-600/5 pointer-events-none" />
        )}
    </button>
);

const StyleCard = ({ style }) => {
    const [copied, setCopied] = useState(false);
    const isGenerating = style.status === 'Generating';

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`group relative bg-[#0f0f16] border rounded-2xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-purple-900/20 flex flex-col
      ${isGenerating ? 'border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'border-slate-800 hover:border-purple-500/50 hover:-translate-y-1.5'}
    `}>
            {/* Image Area */}
            <div className="aspect-video bg-slate-900 relative overflow-hidden">
                {/* Main Image */}
                <img
                    src={style.image}
                    alt={style.name}
                    className={`w-full h-full object-cover transition-all duration-1000 
            ${isGenerating ? 'opacity-0 scale-110 blur-xl' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105 blur-0'}
          `}
                />

                {/* Generation Overlay Effects */}
                {isGenerating && (
                    <>
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={16} className="text-purple-400 animate-pulse" />
                                </div>
                            </div>
                            <span className="text-xs font-mono text-purple-300 animate-pulse">Rendering...</span>
                        </div>
                    </>
                )}

                {/* Overlay Gradient (Always) */}
                <div className={`absolute inset-0 bg-gradient-to-t from-[#0f0f16] via-transparent to-transparent ${isGenerating ? 'opacity-0' : 'opacity-80'}`} />

                {/* Status Badge */}
                {!isGenerating && (
                    <div className="absolute top-3 left-3 z-10">
                        <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-[10px] text-slate-300 border border-white/10 font-mono shadow-lg group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-500 transition-colors">
                            {style.version}
                        </div>
                    </div>
                )}

                {/* Action Menu (Hover) - Only when ready */}
                {!isGenerating && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300 z-10">
                        <div className="flex gap-2">
                            <button className="p-2 bg-black/60 backdrop-blur-md rounded-full text-slate-300 hover:text-white hover:bg-purple-600 transition-colors border border-white/10">
                                <Edit3 size={14} />
                            </button>
                            <button className="p-2 bg-black/60 backdrop-blur-md rounded-full text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors border border-white/10">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="p-5 flex-1 flex flex-col justify-between relative z-10 bg-[#0f0f16] group-hover:bg-[#13131c] transition-colors">
                {isGenerating && (
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-800">
                        <div
                            className="h-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.8)] transition-all duration-300 ease-out"
                            style={{ width: `${style.progress}%` }}
                        />
                    </div>
                )}

                <div>
                    <div className="flex justify-between items-start mb-3">
                        <h3 className={`font-bold text-sm truncate pr-2 leading-tight ${isGenerating ? 'text-purple-300 animate-pulse' : 'text-white'}`}>
                            {style.name}
                        </h3>
                        {!isGenerating && <Sparkles size={14} className="text-yellow-500 shrink-0 mt-0.5" fill="currentColor" />}
                    </div>

                    <div className="space-y-2.5">
                        {/* Base Model Info Removed */}

                        {isGenerating ? (
                            <div className="w-full flex items-center justify-center text-xs text-purple-400 bg-purple-900/10 p-2.5 rounded-lg border border-purple-500/20 font-mono animate-pulse">
                                Generating Preview...
                            </div>
                        ) : (
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-between text-xs text-slate-500 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50 group-hover:border-purple-500/30 transition-colors hover:bg-slate-800 cursor-pointer"
                            >
                                <span className="font-mono text-[10px] uppercase tracking-wide">Prompt</span>
                                <div className="flex items-center gap-2 overflow-hidden pl-2 max-w-[120px]">
                                    <span className="text-purple-400 font-mono truncate">
                                        {style.prompt}
                                    </span>
                                    {copied ? <Check size={12} className="text-green-500 shrink-0" /> : <Copy size={12} className="shrink-0" />}
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Application ---

export default function ArtStylePage() {
    const [hasStyles, setHasStyles] = useState(false);
    const [styles, setStyles] = useState(INITIAL_STYLES);

    // Simulation Logic: Create -> Generate -> Ready
    const handleCreateStyle = () => {
        setHasStyles(true);

        const newStyleId = Date.now();
        const newStyle = {
            id: newStyleId,
            name: "New Style #" + (styles.length + 1),
            prompt: "Generating...",
            image: "https://picsum.photos/seed/" + newStyleId + "/400/300", // Placeholder
            version: "v1.0",
            status: "Generating",
            progress: 0
        };

        // Add new card at the beginning
        setStyles(prev => [newStyle, ...prev]);

        // Simulate Progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 20) + 10; // Faster generation

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                // Mark as Ready
                setTimeout(() => {
                    setStyles(prev => prev.map(s =>
                        s.id === newStyleId
                            ? { ...s, status: "Ready", progress: 100, prompt: "fantasy landscape, oil painting style" }
                            : s
                    ));
                }, 600);
            }

            // Update progress in state
            setStyles(prev => prev.map(s =>
                s.id === newStyleId ? { ...s, progress: progress } : s
            ));

        }, 200);
    };

    return (
        <div className="flex h-screen w-full bg-[#05050a] text-slate-200 font-sans overflow-hidden selection:bg-purple-500/30">

            {/* Background Ambience */}
            <div className="fixed top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/5 rounded-full blur-[150px] pointer-events-none" />

            {/* LEFT SIDEBAR */}
            <aside className="w-64 h-full border-r border-slate-800/50 bg-[#0a0a10]/95 backdrop-blur-xl flex flex-col z-20 flex-shrink-0">
                <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/50 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black italic shadow-lg shadow-purple-900/20">T</div>
                    <div>
                        <span className="font-bold text-white tracking-wide block leading-none">Toonify</span>
                        <span className="text-[10px] text-slate-500 font-medium">AI Webtoon Tool</span>
                    </div>
                </div>

                <div className="p-4 shrink-0">
                    <button className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between hover:border-slate-600 hover:bg-slate-900 transition-all group">
                        <div className="text-left overflow-hidden">
                            <div className="text-xs text-slate-400 font-bold group-hover:text-slate-200 truncate">Test Workspace</div>
                            <div className="text-[10px] text-yellow-500 flex items-center gap-1.5 mt-1 font-mono bg-yellow-500/10 px-1.5 py-0.5 rounded w-fit">
                                <Sparkles size={8} fill="currentColor" /> 50 Credits
                            </div>
                        </div>
                        <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300" />
                    </button>
                </div>

                <div className="flex-1 px-3 space-y-1 overflow-y-auto py-2 custom-scrollbar">
                    <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-6 shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Plus size={16} strokeWidth={3} /> <span className="pt-[1px]">New Project</span>
                    </button>

                    <div className="space-y-1">
                        <SidebarItem icon={LayoutGrid} label="Projects" />
                        <SidebarItem icon={Paintbrush} label="Art Styles" isActive={true} />
                        <SidebarItem icon={LayoutTemplate} label="Templates" />
                        <SidebarItem icon={FolderOpen} label="Assets" />
                    </div>

                    <div className="my-4 h-px bg-slate-800/50 mx-2" />

                    <div className="space-y-1">
                        <SidebarItem icon={Settings} label="Settings" />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800/50 space-y-2 shrink-0 bg-[#0a0a10]">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800/50">
                        <HelpCircle size={14} /> <span className="pt-[1px]">Help & Support</span>
                    </button>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors cursor-pointer group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center overflow-hidden shrink-0 border border-slate-600">
                            <User size={14} className="text-slate-300" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold text-slate-200 truncate group-hover:text-white">Guest Artist</div>
                            <div className="text-[10px] text-slate-500 truncate">Free Plan</div>
                        </div>
                        <LogOut size={14} className="text-slate-600 group-hover:text-slate-400" />
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 h-full overflow-y-auto relative z-10 custom-scrollbar scroll-smooth p-10">

                {/* Header */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">My Art Styles</h1>
                        <p className="text-slate-500 text-sm font-medium">Create custom visual styles using text prompts.</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setHasStyles(!hasStyles)}
                            className="text-xs font-mono text-slate-600 hover:text-purple-400 transition-colors bg-slate-900/50 px-3 py-1.5 rounded border border-slate-800"
                        >
                            Reset View
                        </button>

                        {hasStyles && (
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search styles..."
                                    className="bg-slate-900 border border-slate-700/50 rounded-full pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none w-64 transition-all placeholder:text-slate-600"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full">
                    {hasStyles ? (
                        // POPULATED STATE (Grid)
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up pb-20">
                            {/* Create New Trigger Card */}
                            <button
                                onClick={handleCreateStyle}
                                className="group relative aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-900/20 hover:bg-purple-900/10 transition-all flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-purple-400 cursor-pointer shadow-inner hover:shadow-lg active:scale-95 duration-200"
                            >
                                <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-purple-600 group-hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                                    <Plus size={32} className="text-slate-400 group-hover:text-white" strokeWidth={3} />
                                </div>
                                <span className="font-bold text-sm tracking-wide group-hover:text-purple-300">Generate New</span>
                            </button>

                            {/* Style Cards */}
                            {styles.map(style => (
                                <StyleCard key={style.id} style={style} />
                            ))}
                        </div>
                    ) : (
                        // EMPTY STATE (Initial)
                        <div className="w-full h-[600px] flex items-center justify-center animate-fade-in">
                            <div className="bg-[#0f0f16] border border-slate-800 rounded-3xl p-12 max-w-2xl w-full text-center relative overflow-hidden shadow-2xl group">
                                {/* Dynamic Background Glow */}
                                <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] group-hover:bg-purple-600/20 transition-colors duration-700" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center mb-8 border border-slate-700 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                        <ImageIcon size={40} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                                    </div>

                                    <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Generate Your First Style</h2>
                                    <p className="text-slate-400 text-base mb-10 max-w-md leading-relaxed">
                                        Simply enter a prompt to generate unique style references. No complex training required.
                                    </p>

                                    <button
                                        onClick={handleCreateStyle}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-900/30 hover:shadow-purple-900/50 hover:translate-y-[-2px] transition-all flex items-center gap-2 group/btn active:scale-95"
                                    >
                                        <Zap size={20} fill="currentColor" className="group-hover/btn:animate-pulse" />
                                        Start Generating
                                    </button>

                                    <div className="mt-10 flex gap-8 text-xs text-slate-600 font-mono border-t border-slate-800/50 pt-6">
                                        <span className="flex items-center gap-1.5"><Command size={12} /> Prompt to Style</span>
                                        <span className="flex items-center gap-1.5"><Layers size={12} /> Instant Preview</span>
                                        <span className="flex items-center gap-1.5"><Sparkles size={12} /> 50 Free Credits</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </main>

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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
            animation: fadeIn 0.8s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}