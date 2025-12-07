'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

interface Project {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    style_preset: string;
    worldview?: string;
}

interface EditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onUpdate: (updatedProject: Project) => void;
}

export default function EditProjectModal({ isOpen, onClose, project, onUpdate }: EditProjectModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        worldview: '',
        style_preset: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title || '',
                subtitle: project.subtitle || '',
                description: project.description || '',
                worldview: project.worldview || '',
                style_preset: project.style_preset || ''
            });
        }
    }, [project, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.patch(`/projects/${project.id}`, {
                title: formData.title,
                subtitle: formData.subtitle,
                description: formData.description,
                worldview: formData.worldview,
                style_preset: formData.style_preset
            });
            onUpdate(response.data);
            onClose();
        } catch (error) {
            console.error("Failed to update project", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAugmentWorldview = async () => {
        if (!formData.worldview) return;
        setLoading(true);
        try {
            const response = await api.post('/projects/worldview/augment', {
                description: formData.worldview
            });
            if (response.data && response.data.augmented_worldview) {
                setFormData(prev => ({ ...prev, worldview: response.data.augmented_worldview }));
            }
        } catch (error) {
            console.error("Augmentation failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Edit Project Details</DialogTitle>
                    <DialogDescription>
                        Make changes to your project here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="subtitle" className="text-right">Subtitle</Label>
                        <Input id="subtitle" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="style_preset" className="text-right">Style</Label>
                        <Input id="style_preset" value={formData.style_preset} onChange={(e) => setFormData({ ...formData, style_preset: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="col-span-3 min-h-[80px]" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="worldview" className="text-right pt-2">Worldview</Label>
                        <div className="col-span-3 flex flex-col gap-2">
                            <Textarea
                                id="worldview"
                                value={formData.worldview}
                                onChange={(e) => setFormData({ ...formData, worldview: e.target.value })}
                                className="min-h-[120px]"
                                placeholder="Describe the world, magic system, key rules..."
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAugmentWorldview}
                                disabled={loading || !formData.worldview}
                                className="self-start text-[#6039FE] hover:text-[#4B38FE] p-0 h-auto font-medium"
                            >
                                {loading ? 'Augmenting...' : '✨ AI Augment Description'}
                            </Button>
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
