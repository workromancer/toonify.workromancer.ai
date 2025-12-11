'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, Film, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EpisodeOption {
    title: string;
    summary: string;
    reason: string;
}

interface EpisodeGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onEpisodeCreated: (episodeId: string) => void;
}

export default function EpisodeGenerationModal({ isOpen, onClose, projectId, onEpisodeCreated }: EpisodeGenerationModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<EpisodeOption[]>([]);
    const [selectedOption, setSelectedOption] = useState<EpisodeOption | null>(null);
    const [customTitle, setCustomTitle] = useState('');
    const [customSummary, setCustomSummary] = useState('');
    const [numCuts, setNumCuts] = useState(6);
    const { toast } = useToast();

    // Step 1: Generate Options
    const generateOptions = async () => {
        setLoading(true);
        try {
            const res = await api.post('/episodes/generate-options', null, {
                params: { project_id: projectId } // Send as query param if backend expects it or adjust body
            });
            // Backend expects query param? Let's check backend signature.
            // Backend: @router.post("/generate-options") def generate_episode_options(*, project_id: UUID, ...) 
            // It's a query param in recent changes if not in body. 
            // Actually router definition: def generate_episode_options(*, project_id: UUID, ...)
            // FastAPI usually takes this as query param unless Body() is used.
            // Let's try passing as query param.

            // Wait, looking at backend: 
            // @router.post("/generate-options")
            // def generate_episode_options(*, project_id: UUID, ...):
            // It is a query param. 

            if (res.data && res.data.options) {
                setOptions(res.data.options);
            }
        } catch (err) {
            console.error("Failed to generate options", err);
            toast({
                title: "Generation Failed",
                description: "Could not generate episode ideas. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (opt: EpisodeOption) => {
        setSelectedOption(opt);
        setCustomTitle(opt.title);
        setCustomSummary(opt.summary);
        setStep(2);
    };

    const handleManualEntry = () => {
        setSelectedOption(null);
        setCustomTitle('');
        setCustomSummary('');
        setStep(2);
    };

    // Step 2: Create Episode & Generate Cuts
    const handleCreate = async () => {
        if (!customTitle) return;
        setLoading(true);
        try {
            // POST /episodes/generate-cuts
            // Body: GenerateCutsRequest { project_id, episode_title, episode_summary, style?, num_cuts }

            const res = await api.post('/episodes/generate-cuts', {
                project_id: projectId,
                episode_title: customTitle,
                episode_summary: customSummary,
                num_cuts: numCuts
            });

            toast({
                title: "Episode Created",
                description: `Created "${customTitle}" with ${res.data.cuts_count} cuts.`,
            });

            onEpisodeCreated(res.data.episode_id);
            handleClose();

        } catch (err) {
            console.error("Failed to create episode", err);
            toast({
                title: "Creation Failed",
                description: "Could not create episode. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        // Reset state
        setTimeout(() => {
            setStep(1);
            setOptions([]);
            setSelectedOption(null);
            setCustomTitle('');
            setCustomSummary('');
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-purple-400" size={20} />
                        {step === 1 ? 'Generate Episode Ideas' : 'Configure Episode'}
                    </DialogTitle>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-6 py-4">
                        <div className="flex justify-center">
                            {options.length === 0 && !loading && (
                                <div className="text-center space-y-4">
                                    <p className="text-gray-400">Let AI suggest upcoming episode ideas based on your project and recent episodes.</p>
                                    <Button onClick={generateOptions} className="bg-purple-600 hover:bg-purple-700">
                                        <Sparkles className="mr-2 h-4 w-4" /> Suggest Ideas
                                    </Button>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-700" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-gray-900 px-2 text-gray-500">Or</span>
                                        </div>
                                    </div>
                                    <Button variant="outline" onClick={handleManualEntry} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                                        Start from Scratch
                                    </Button>
                                </div>
                            )}

                            {loading && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                                    <p className="text-gray-400 animate-pulse">Consulting the writers' room...</p>
                                </div>
                            )}
                        </div>

                        {options.length > 0 && (
                            <div className="grid gap-4">
                                {options.map((opt, i) => (
                                    <Card
                                        key={i}
                                        className="bg-gray-800 border-gray-700 hover:border-purple-500 cursor-pointer transition-all hover:bg-gray-800/80 group"
                                        onClick={() => handleOptionSelect(opt)}
                                    >
                                        <CardHeader>
                                            <CardTitle className="text-lg text-purple-300 group-hover:text-purple-200 flex justify-between">
                                                {opt.title}
                                                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </CardTitle>
                                            <CardDescription className="text-gray-400 mt-2">
                                                {opt.summary}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-xs text-gray-500 italic">Why: {opt.reason}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Button variant="ghost" onClick={handleManualEntry} className="w-full text-gray-400 hover:text-white">
                                    Skip to details
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Episode Title</Label>
                            <Input
                                id="title"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                className="bg-gray-800 border-gray-700"
                                placeholder="E.g. The Beginning of the End"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summary">Plot Summary (for AI Context)</Label>
                            <Textarea
                                id="summary"
                                value={customSummary}
                                onChange={(e) => setCustomSummary(e.target.value)}
                                className="bg-gray-800 border-gray-700 min-h-[100px]"
                                placeholder="Describe what happens in this episode..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cuts">Number of Cuts</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="cuts"
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={numCuts}
                                    onChange={(e) => setNumCuts(parseInt(e.target.value))}
                                    className="bg-gray-800 border-gray-700 w-24"
                                />
                                <span className="text-sm text-gray-400">Recommended: 4-8 for short episodes</span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 2 && (
                        <div className="flex justify-between w-full">
                            <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
                                Back
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={!customTitle || loading}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Cuts...
                                    </>
                                ) : (
                                    <>
                                        <Film className="mr-2 h-4 w-4" /> Create Episode
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
