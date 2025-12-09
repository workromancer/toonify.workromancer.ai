'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import CharacterCastingWizard from '@/components/project/CharacterCastingWizard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CastingPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId as string;
    const [stylePreset, setStylePreset] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            try {
                const res = await api.get(`/projects/${projectId}`);
                // Use 'art_style' if available (custom), else style_preset
                setStylePreset(res.data.art_style || res.data.style_preset || 'anime_webtoon');
            } catch (err) {
                console.error("Failed to fetch project", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#13111C] text-white">
                Loading...
            </div>
        );
    }

    if (!stylePreset) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#13111C] text-white flex-col gap-4">
                <p>Project not found.</p>
                <Button onClick={() => router.push('/dashboard')}>Go Home</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#13111C] text-white flex flex-col">
            {/* Simple Header */}
            <header className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => router.push(`/project/${projectId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
                    </Button>
                    <h1 className="font-bold text-lg hidden md:block">Character Casting Studio</h1>
                </div>
                <div className="text-sm text-gray-500">
                    Style: <span className="text-primary font-medium">{stylePreset}</span>
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
                {/* Background Glow */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

                <CharacterCastingWizard
                    projectId={projectId}
                    stylePreset={stylePreset}
                />
            </div>
        </div>
    );
}
