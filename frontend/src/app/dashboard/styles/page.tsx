'use client';

import { useState, useEffect } from 'react';
import { Palette, ArrowRight, Loader2, Sparkles, Plus } from 'lucide-react';
import ArtStyleSelectionModal from '@/components/styles/ArtStyleSelectionModal';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { SelectionCard } from '@/components/ui/selection-card';
import { cn } from '@/lib/utils';
import CreateStyleModal from '@/components/project/modals/CreateStyleModal'; // Reuse existing modal component if possible, or trigger ArtStyleSelectionModal

interface ArtStyle {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    status: string;
}

export default function ArtStylesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [styles, setStyles] = useState<ArtStyle[]>([]);
    const [loading, setLoading] = useState(true);

    const searchParams = useSearchParams();
    const router = useRouter();

    const fromProjectSetup = searchParams.get('from') === 'project_setup';
    const projectId = searchParams.get('projectId');
    const projectTitle = searchParams.get('title');

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
         // If we want to open the specific create modal directly:
         setIsCreateModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto p-8 relative min-h-full pb-24">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Art Styles</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage and generate your custom AI art styles.</p>
                        {fromProjectSetup && (
                            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg inline-flex items-center gap-2 text-sm text-purple-300">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                Creating style for project: <span className="font-bold text-white">{projectTitle || "Unknown Project"}</span>
                            </div>
                        )}
                    </div>
                    {styles.length > 0 && (
                        <Button onClick={handleCreateClick} className="gap-2">
                            <Plus size={16} /> New Style
                        </Button>
                    )}
                </header>

                <div className="grid gap-6">
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : styles.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                            <div className="max-w-md space-y-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-purple-500/30">
                                    <Sparkles className="text-purple-400" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Your First Style</h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
                                       Define a unique visual identity for your stories. Train a custom AI model or blend existing styles.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleCreateClick}
                                    size="lg"
                                    className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:scale-105 transition-all duration-300"
                                >
                                    Start Creating
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                             {styles.map((style) => (
                                 <SelectionCard
                                     key={style.id}
                                     selected={false}
                                     showCheck={false}
                                     className="flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 border-gray-800 bg-gray-900/50"
                                 >
                                     <div className="aspect-square rounded-lg mb-3 overflow-hidden relative bg-gray-800">
                                         {style.imageUrl ? (
                                             <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
                                         ) : (
                                             <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 p-4 text-center">
                                                 {(style.status === 'processing' || style.status === 'pending') ? (
                                                     <>
                                                         <Loader2 size={20} className="animate-spin text-purple-500" />
                                                         <p className="text-xs text-gray-500">Generating Preview...</p>
                                                     </>
                                                 ) : (
                                                     <p className="text-xs font-mono text-white/40 uppercase tracking-wider">
                                                         {style.name}
                                                     </p>
                                                 )}
                                             </div>
                                         )}
                                          {(style.status === 'processing' || style.status === 'pending') && (
                                              <div className="absolute top-2 right-2">
                                                   <span className="relative flex h-2 w-2">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                                    </span>
                                              </div>
                                          )}
                                     </div>
                                     <div>
                                         <h3 className="font-semibold text-white mb-1">{style.name}</h3>
                                         {style.description && (
                                             <p className="text-xs text-gray-400 line-clamp-2">{style.description}</p>
                                         )}
                                     </div>
                                 </SelectionCard>
                             ))}
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
                
                {/* Keep existing logic for ArtStyleSelectionModal if needed for 'Explore', 
                    but prioritization is on 'Create' per user request */}
                <ArtStyleSelectionModal 
                    open={isModalOpen} 
                    onOpenChange={setIsModalOpen}
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
        </DashboardLayout>
    );
}
