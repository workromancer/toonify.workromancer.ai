'use client';

import { useState } from 'react';
import { Palette } from 'lucide-react';
import ArtStyleSelectionModal from '@/components/styles/ArtStyleSelectionModal';

export default function ArtStylesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Art Styles</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage and generate your custom AI art styles.</p>
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
        </div>
    );
}
