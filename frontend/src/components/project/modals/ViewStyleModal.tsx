import React from 'react';
import { X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewStyleModalProps {
    isOpen: boolean;
    onClose: () => void;
    styleName: string;
    styleImageUrl?: string;
    description?: string;
}

export default function ViewStyleModal({
    isOpen,
    onClose,
    styleName,
    styleImageUrl,
    description
}: ViewStyleModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#2c2c44] rounded-xl shadow-2xl relative text-white border border-[#5a5a7d] overflow-hidden flex flex-col">
                
                {/* Header */}
                <header className="bg-[#2c2c44] px-6 py-4 border-b border-[#5a5a7d]/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Palette className="text-[#8e44ad]" size={20} />
                        <h2 className="text-xl font-bold">Project Art Style</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 flex flex-col gap-6">
                    {/* Style Image */}
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/40 border border-white/10 relative group">
                        {styleImageUrl ? (
                            <img 
                                src={styleImageUrl} 
                                alt={styleName} 
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                <Palette size={48} className="opacity-20" />
                                <span className="text-sm">No Preview Image Available</span>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Selected Style</span>
                        </div>
                    </div>

                    {/* Info */}
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2 capitalize">{styleName.replace(/_/g, ' ')}</h3>
                        <p className="text-gray-300 leading-relaxed">
                            {description || "The visual identity chosen for this project."}
                        </p>
                    </div>

                    {/* Footer / Info Note */}
                    <div className="p-4 rounded-lg bg-[#8e44ad]/10 border border-[#8e44ad]/20 text-xs text-[#d2b4de]">
                        <strong>Note:</strong> The art style is fixed for consistency across all episodes and characters in this project.
                    </div>
                </div>

                <footer className="px-6 py-4 bg-[#232336] border-t border-[#5a5a7d]/30 flex justify-end">
                    <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                        Close
                    </Button>
                </footer>

            </div>
        </div>
    );
}
