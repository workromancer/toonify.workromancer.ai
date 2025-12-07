'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface NewProjectModalProps {
    onProjectCreated: () => void;
}

export default function NewProjectModal({ onProjectCreated }: NewProjectModalProps) {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
    const router = useRouter();

    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setError('');
        try {
            await api.post('/projects/', {
                title: data.title,
                style_preset: data.style_preset || 'anime_webtoon'
            });
            setOpen(false);
            reset();
            onProjectCreated();
        } catch (err) {
            console.error(err);
            setError('Failed to create project. Please try again.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                    <Plus className="mr-2" size={20} /> New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Give your new webtoon a title and choose a style.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...register('title', { required: true })} placeholder="My Awesome Webtoon" />
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="style">Style Preset</Label>
                        <select
                            id="style"
                            {...register('style_preset')}
                            className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="anime_webtoon">Anime / Webtoon</option>
                            <option value="american_comic">American Comic</option>
                            <option value="black_and_white">Black & White Manga</option>
                            <option value="watercolor">Watercolor</option>
                        </select>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-900/20 border border-red-900 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
