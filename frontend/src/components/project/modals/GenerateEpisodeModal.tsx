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

export default function GenerateEpisodeModal({ isOpen, onClose, projectId, onGenerate, nextOrder }: GenerateEpisodeModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        story_summary: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post(`/episodes/`, {
                title: formData.title,
                project_id: projectId,
                episode_order: nextOrder,
                story_summary: formData.story_summary
            });
            onGenerate(response.data);
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
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ep-title" className="text-right">Title</Label>
                        <Input id="ep-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="col-span-3" placeholder="e.g. The Beginning" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ep-summary" className="text-right">Story Summary</Label>
                        <Textarea id="ep-summary" value={formData.story_summary} onChange={(e) => setFormData({ ...formData, story_summary: e.target.value })} className="col-span-3" placeholder="What happens in this episode? (AI will generate scenes)" rows={5} />
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>{loading ? 'Generating...' : 'Start Generation'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
