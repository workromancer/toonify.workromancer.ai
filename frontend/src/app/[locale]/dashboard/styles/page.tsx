'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
    LayoutGrid, Paintbrush, LayoutTemplate, FolderOpen, Settings,
    Plus, Search, MoreVertical, LogOut, User,
    HelpCircle, ChevronDown, Sparkles, Wand2,
    Zap, Command, Layers, Trash2, Edit3, Copy, Check, Loader2, Image as ImageIcon, ArrowRight
} from 'lucide-react';
import { useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import CreateStyleModal from '@/components/project/modals/CreateStyleModal';
import { cn } from '@/lib/utils';
import ArtStyleSelectionModal from '@/components/styles/ArtStyleSelectionModal';

interface ArtStyle {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    status: string;
    // adding optional fields to match reference usage if backend doesn't support them yet
    version?: string;
    progress?: number;
    prompt?: string;
    image?: string; // fallback
}

const StyleCard = ({ style }: { style: ArtStyle }) => {
    const [copied, setCopied] = useState(false);
    // Map status 'processing' or 'pending' to reference's 'Generating' behavior
    const isGenerating = style.status === 'processing' || style.status === 'pending' || style.status === 'Generating';

    // Prioritize imageUrl, fallback to image (ref style), fallback to empty
    const imageUrl = style.imageUrl || style.image || '';
    const promptText = style.prompt || style.description || "No prompt provided";
    const version = style.version || "v1.0";

    const handleCopy = () => {
        if (promptText) {
            navigator.clipboard.writeText(promptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`group relative bg-[#0f0f16] border rounded-2xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-purple-900/20 flex flex-col
      ${isGenerating ? 'border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'border-slate-800 hover:border-purple-500/50 hover:-translate-y-1.5'}
    `}>
            {/* Image Area */}
            <div className="aspect-video bg-slate-900 relative overflow-hidden">
                {/* Main Image */}
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={style.name}
                        className={`w-full h-full object-cover transition-all duration-1000 
            ${isGenerating ? 'opacity-0 scale-110 blur-xl' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105 blur-0'}
          `}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        {isGenerating ? null : <ImageIcon className="text-slate-600" />}
                    </div>
                )}

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
                            {version}
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
                {isGenerating && style.progress !== undefined && (
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
                                        {promptText}
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

function ArtStylesContent() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [styles, setStyles] = useState<ArtStyle[]>([]);
    const [loading, setLoading] = useState(true);

    const searchParams = useSearchParams();
    const router = useRouter();

    const fromProjectSetup = searchParams?.get('from') === 'project_setup';
    const projectId = searchParams?.get('projectId');
    const projectTitle = searchParams?.get('title');

    const fetchStyles = async () => {
        try {
            const res = await api.get('/styles');
            setStyles(res.data);
        } catch (error) {
            console.error("Failed to fetch styles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStyles();
    }, []);

    // Initial styles polling if any are processing
    useEffect(() => {
        const hasProcessing = styles.some(s => s.status === 'processing' || s.status === 'pending');
        if (hasProcessing) {
            const timer = setTimeout(fetchStyles, 3000);
            return () => clearTimeout(timer);
        }
    }, [styles]);

    const handleCreateClick = () => {
        setIsCreateModalOpen(true);
    };

    return (
        <>
            <div className="relative min-h-full bg-[#05050a] text-slate-200 font-sans selection:bg-purple-500/30 p-8">
                {/* Background Ambience */}
                <div className="fixed top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/5 rounded-full blur-[150px] pointer-events-none" />
                <div className="fixed bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/5 rounded-full blur-[150px] pointer-events-none" />

                {/* Header */}
                <div className="flex justify-between items-end mb-10 relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">My Art Styles</h1>
                        <p className="text-slate-500 text-sm font-medium">Create custom visual styles using text prompts.</p>
                        {fromProjectSetup && (
                            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg inline-flex items-center gap-2 text-sm text-purple-300">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                Creating style for project: <span className="font-bold text-white">{projectTitle || "Unknown Project"}</span>
                            </div>
                        )}
                    </div>

                    {/* View Toggle / Search */}
                    <div className="flex items-center gap-4">
                        {styles.length > 0 && (
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
                <div className="w-full relative z-10 pb-20">
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : styles.length > 0 ? (
                        // POPULATED STATE (Grid)
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                            {/* Create New Trigger Card */}
                            <button
                                onClick={handleCreateClick}
                                className="group relative aspect-video rounded-2xl border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-900/20 hover:bg-purple-900/10 transition-all flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-purple-400 cursor-pointer shadow-inner hover:shadow-lg active:scale-95 duration-200"
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
                                        onClick={handleCreateClick}
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

                <CreateStyleModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={() => {
                        fetchStyles();
                        setIsCreateModalOpen(false);
                    }}
                />

                <ArtStyleSelectionModal
                    open={isSelectionModalOpen}
                    onOpenChange={setIsSelectionModalOpen}
                />

                {/* Floating CTA for Return Flow */}
                {fromProjectSetup && (
                    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <Button
                            onClick={() => router.push(`/project/${projectId}?setup=true`)}
                            size="lg"
                            className="bg-purple-600 hover:bg-purple-500 text-white shadow-[0_10px_40px_rgba(168,85,247,0.4)] border border-purple-400/50 px-8 h-14 rounded-full font-bold text-lg flex items-center gap-3 transition-transform hover:-translate-y-1"
                        >
                            Return to Project Setup <ArrowRight size={20} />
                        </Button>
                    </div>
                )}
            </div>
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
        </>
    );
}

export default function ArtStylesPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[300px] h-full">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                </div>
            }>
                <ArtStylesContent />
            </Suspense>
        </DashboardLayout>
    );
}
