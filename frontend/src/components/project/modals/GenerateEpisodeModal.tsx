'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

interface GenerateEpisodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onGenerate: (newEpisode: any) => void;
    nextOrder: number;
}

import { Loader2, Sparkles } from 'lucide-react';

interface Idea {
    title: string;
    summary: string;
    reason: string;
}

export default function GenerateEpisodeModal({ isOpen, onClose, projectId, onGenerate, nextOrder }: GenerateEpisodeModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        story_summary: '',
        num_cuts: 6
    });
    const [loading, setLoading] = useState(false);
    const [loadingIdeas, setLoadingIdeas] = useState(false);
    const [showIdeas, setShowIdeas] = useState(false);
    const [ideas, setIdeas] = useState<Idea[]>([]);

    const handleSuggestIdeas = async () => {
        setLoadingIdeas(true);
        try {
            const res = await api.post(`/projects/${projectId}/episodes/ideas`);
            if (res.data.options) {
                setIdeas(res.data.options);
                setShowIdeas(true);
            }
        } catch (e) {
            console.error("Failed to get ideas", e);
        } finally {
            setLoadingIdeas(false);
        }
    };

    const selectIdea = (idea: Idea) => {
        setFormData({ ...formData, title: idea.title, story_summary: idea.summary });
        setShowIdeas(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Use new endpoint that creates cuts
            const response = await api.post(`/projects/${projectId}/episodes/create`, {
                project_id: projectId,
                title: formData.title,
                summary: formData.story_summary,
                num_cuts: formData.num_cuts
            });

            // We need to pass back a proper episode object. 
            // The endpoint returns { episode_id, cuts_count }.
            // We'll mock the object structure for the UI list or ideally trigger a reload.
            // Let's assume onGenerate adds it to the list.
            const newEpisode = {
                id: response.data.episode_id,
                title: formData.title,
                story_summary: formData.story_summary,
                episode_order: nextOrder, // Logic in backend might differ slightly but close enough
                cuts_count: response.data.cuts_count
            };

            onGenerate(newEpisode);
            onClose();
        } catch (error) {
            console.error("Failed to generate episode", error);
        } finally {
            setLoading(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Generate New Episode</DialogTitle>
                    <DialogDescription>
                        Start a new episode. We'll generate a storyboard based on your summary.
                    </DialogDescription>
                </DialogHeader>
                {!showIdeas ? (
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="flex justify-end mb-2">
                            <Button type="button" variant="outline" size="sm" onClick={handleSuggestIdeas} disabled={loadingIdeas}>
                                {loadingIdeas ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Suggest Ideas
                            </Button>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-title" className="text-right">Title</Label>
                            <Input id="ep-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="col-span-3" placeholder="e.g. The Beginning" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-summary" className="text-right">Story Summary</Label>
                            <Textarea id="ep-summary" value={formData.story_summary} onChange={(e) => setFormData({ ...formData, story_summary: e.target.value })} className="col-span-3" placeholder="What happens in this episode? (AI will generate scenes)" rows={5} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="num-cuts" className="text-right">Cuts</Label>
                            <Input type="number" id="num-cuts" value={formData.num_cuts} onChange={(e) => setFormData({ ...formData, num_cuts: parseInt(e.target.value) })} className="col-span-3" min={4} max={20} />
                        </div>
                    </form>
                ) : (
                    <div className="py-4 space-y-4">
                        <h3 className="font-semibold text-sm text-gray-500">Select an idea:</h3>
                        <div className="grid gap-3">
                            {ideas.map((idea, idx) => (
                                <div key={idx} onClick={() => selectIdea(idea)} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group">
                                    <div className="font-bold text-primary group-hover:text-primary/80">{idea.title}</div>
                                    <div className="text-xs text-gray-500 my-1">{idea.reason}</div>
                                    <div className="text-sm">{idea.summary}</div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowIdeas(false)} className="w-full">Cancel</Button>
                    </div>
                )}

                {!showIdeas && (
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" onClick={handleSubmit} disabled={loading}>
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Cuts...</> : 'Start Generation'}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
