'use client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

interface OutfitImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterName: string;
    outfitImageUrl: string | null;
    outfitDescription?: string;
    onRegenerate?: () => void;
    isRegenerating?: boolean;
}

export default function OutfitImageModal({
    isOpen,
    onClose,
    characterName,
    outfitImageUrl,
    outfitDescription,
    onRegenerate,
    isRegenerating
}: OutfitImageModalProps) {
    
    if (!outfitImageUrl) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent hideCloseButton className="max-w-6xl p-0 overflow-hidden bg-[#0F0F12] border border-gray-800 text-white sm:rounded-2xl">
                <VisuallyHidden>
                    <DialogTitle>{characterName} - 아웃핏</DialogTitle>
                </VisuallyHidden>
                
                <div className="relative">
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                        <div>
                            <h2 className="text-lg font-bold text-white">{characterName}</h2>
                            <span className="text-xs text-purple-400">아웃핏 레퍼런스</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {onRegenerate && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRegenerate}
                                    disabled={isRegenerating}
                                    className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                                >
                                    <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                                    <span className="ml-2 hidden sm:inline">
                                        {isRegenerating ? '생성 중...' : '재생성'}
                                    </span>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                            >
                                <X size={20} />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Image */}
                    <div className="flex items-center justify-center bg-[#0a0a0f] min-h-[400px]">
                        <img
                            src={outfitImageUrl}
                            alt={`${characterName} outfit`}
                            className="w-full h-auto max-h-[85vh] object-contain"
                        />
                    </div>
                    
                    {/* Footer with outfit description */}
                    {outfitDescription && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                            <div className="max-w-3xl mx-auto">
                                <span className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">의상 설명</span>
                                <p className="text-sm text-gray-200 mt-1 leading-relaxed">{outfitDescription}</p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
