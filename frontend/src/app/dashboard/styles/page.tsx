'use client';

import { useState } from 'react';
import { Palette, ArrowRight } from 'lucide-react';
import ArtStyleSelectionModal from '@/components/styles/ArtStyleSelectionModal';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ArtStylesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    const fromProjectSetup = searchParams.get('from') === 'project_setup';
    const projectId = searchParams.get('projectId');
    const projectTitle = searchParams.get('title');

    return (
        <div className="p-8 relative min-h-full pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Art Styles</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage and generate your custom AI art styles.</p>
                {fromProjectSetup && (
                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg inline-flex items-center gap-2 text-sm text-purple-300">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        Creating style for project: <span className="font-bold text-white">{projectTitle || "Unknown Project"}</span>
                    </div>
                )}
            </header>

            <div className="grid gap-6">
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <div className="max-w-md space-y-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Palette className="text-primary" size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Explore Art Styles</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                           Browse our collection of pre-trained models or train your own style.
                        </p>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-105"
                        >
                            Open Style Selector
                        </button>
                    </div>
                </div>
            </div>

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
    );
}
