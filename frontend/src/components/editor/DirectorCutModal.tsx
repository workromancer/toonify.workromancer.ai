'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

interface StoryCut {
    id: string;
    cut_order: number;
    script: string;
    aspect_ratio: string;
    image_path?: string;
}

interface DirectorCutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cut: StoryCut | null;
    onUpdate: () => void;
}

export default function DirectorCutModal({ isOpen, onClose, cut, onUpdate }: DirectorCutModalProps) {
    const [instruction, setInstruction] = useState('');
    const [isModifying, setIsModifying] = useState(false);

    const handleModify = async () => {
        if (!cut || !cut.image_path || !instruction.trim()) return;

        setIsModifying(true);
        try {
            const res = await api.post('/scenes/modify', {
                original_image_url: cut.image_path,
                instruction: instruction
            });

            const newImageUrl = res.data.image_url;

            // Update the cut with the new image
            await api.put(`/cuts/${cut.id}`, {
                image_path: newImageUrl
            });

            onUpdate();
            onClose();
            setInstruction('');
        } catch (err) {
            console.error("Modification Failed", err);
            alert("Failed to modify scene.");
        } finally {
            setIsModifying(false);
        }
    };

    if (!cut) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-purple-400" size={20} /> Director's Cut
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-gray-700">
                        {cut.image_path ? (
                            <img src={cut.image_path} alt="Current Cut" className="max-h-[300px] object-contain" />
                        ) : (
                            <div className="text-gray-500">No image to modify</div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instruction" className="text-gray-300">Modification Instruction</Label>
                        <Textarea
                            id="instruction"
                            placeholder="e.g., 'Make the character look angrier', 'Change to night time', 'Zoom in on the face'"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            className="bg-gray-800 border-gray-700 focus:border-purple-500"
                        />
                        <div className="flex gap-2 mt-2">
                            {['Make it night', 'Zoom in', 'Change expression to happy'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInstruction(suggestion)}
                                    className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2 py-1 rounded text-gray-400 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isModifying}>Cancel</Button>
                    <Button 
                        onClick={handleModify} 
                        disabled={isModifying || !instruction.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isModifying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Modifying...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" /> Apply Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
