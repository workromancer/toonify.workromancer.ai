'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Sparkles, Image as ImageIcon, RotateCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    default_mood: string;
    profile_image_url?: string;
}

export default function CharacterCastingPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as string;
    const { toast } = useToast();

    // State
    const [name, setName] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [style, setStyle] = useState('Shonen');
    const [mood, setMood] = useState('neutral');

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);

    const [cast, setCast] = useState<Character[]>([]);
    const [projectTitle, setProjectTitle] = useState('Project');

    useEffect(() => {
        // Fetch existing cast and project info
        const fetchData = async () => {
            if (!projectId) return;
            try {
                const [castRes, projectRes] = await Promise.all([
                    api.get(`/characters/?project_id=${projectId}`),
                    api.get(`/projects/${projectId}`)
                ]);
                setCast(castRes.data);
                setProjectTitle(projectRes.data.title);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, [projectId]);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (indexToRemove: number) => {
        setTags(tags.filter((_, index) => index !== indexToRemove));
    };

    const handleGenerate = async () => {
        if (!name) {
            toast({
                title: "Incomplete",
                description: "Please enter a character name to continue.",
                variant: "destructive"
            });
            return;
        }
        setIsGenerating(true);
        try {
            let charId = currentCharacterId;
            // 1. Create or Update Character
            if (!charId) {
                const createRes = await api.post('/characters/', {
                    name,
                    project_id: projectId,
                    appearance_tags: tags,
                    default_mood: mood
                });
                charId = createRes.data.id;
                setCurrentCharacterId(charId);
            } else {
                await api.patch(`/characters/${charId}`, {
                    name,
                    appearance_tags: tags,
                    default_mood: mood
                });
            }

            // 2. Generate Image
            const genRes = await api.post(`/characters/${charId}/generate`);
            setGeneratedImage(genRes.data.profile_image_url);

            // Refresh cast list
            const castRes = await api.get(`/characters/?project_id=${projectId}`);
            setCast(castRes.data);

            toast({
                title: "Magic Complete",
                description: "Character generated successfully!",
            });

        } catch (err) {
            console.error("Generation failed", err);
            toast({
                title: "Generation Error",
                description: "Failed to generate character. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAndExit = () => {
        if (!currentCharacterId && name) {
            handleGenerate().then(() => router.push(`/project/${projectId}/characters`));
            return;
        }
        router.push(`/project/${projectId}/characters`);
    };

    return (
        <DashboardLayout>
            <div className="flex h-full flex-col p-6 md:p-8 overflow-hidden max-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-300">
                            <Link href="/dashboard" className="hover:text-white transition-colors">My Projects</Link>
                            <span>/</span>
                            <Link href={`/project/${projectId}`} className="hover:text-white transition-colors">{projectTitle}</Link>
                            <span>/</span>
                            <span className="text-white font-medium">Casting</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Casting Studio</h1>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleSaveAndExit}
                            className="bg-primary hover:bg-primary/90 text-white gap-2 font-bold shadow-lg shadow-primary/20"
                        >
                            <Save size={18} /> Save & Exit
                        </Button>
                    </div>
                </div>

                {/* Main 3-Column Content */}
                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                    {/* Left Column: Controls */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles size={20} className="text-primary" /> Character Design
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Name</label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Kaelen Shadowblade"
                                        className="bg-background-dark border-gray-600 focus-visible:ring-primary text-white placeholder:text-gray-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Appearance Tags</label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-background-dark border border-gray-600 rounded-md min-h-[42px]">
                                        {tags.map((tag, i) => (
                                            <Badge key={i} variant="secondary" className="bg-primary/20 text-white hover:bg-primary/30 gap-1 pr-1 border border-primary/30">
                                                {tag}
                                                <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => removeTag(i)} />
                                            </Badge>
                                        ))}
                                        <input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            className="bg-transparent outline-none flex-1 min-w-[60px] text-sm text-white placeholder:text-gray-500"
                                            placeholder="Add tag..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Mood</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['happy', 'neutral', 'sad', 'angry'].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setMood(m)}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                                                    mood === m
                                                        ? "bg-primary/20 border-primary text-white"
                                                        : "bg-background-dark border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                                                )}
                                            >
                                                <span className="text-xl mb-1 capitalize">
                                                    {m === 'happy' ? '😊' : m === 'neutral' ? '😐' : m === 'sad' ? '😢' : '😡'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
                            >
                                {isGenerating ? 'Magic in progress...' : 'Generate Character'}
                            </Button>
                        </div>
                    </div>

                    {/* Center Column: Canvas */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col bg-black/40 border border-white/5 rounded-2xl overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            {generatedImage ? (
                                <div className="relative w-full h-full max-w-md aspect-[3/4] group">
                                    <img
                                        src={generatedImage}
                                        className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10"
                                        alt="Generated Character"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-xl backdrop-blur-sm">
                                        <Button variant="outline" onClick={handleGenerate} className="border-white/20 text-white hover:bg-white/10 gap-2">
                                            <RotateCw size={16} /> Vary
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                        <ImageIcon size={40} className="opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-gray-200">Your character will appear here</p>
                                    <p className="text-sm">Configure existing details and press Generate</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Cast List */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pl-2 custom-scrollbar">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4">Current Cast</h3>
                            <div className="space-y-3">
                                {cast.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setName(c.name);
                                            setTags(c.appearance_tags || []);
                                            setMood(c.default_mood || 'neutral');
                                            setGeneratedImage(c.profile_image_url || null);
                                            setCurrentCharacterId(c.id);
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border border-transparent",
                                            currentCharacterId === c.id ? "bg-primary/20 border-primary/50" : "hover:bg-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="size-10 rounded-md bg-cover bg-center bg-gray-800" style={{ backgroundImage: `url("${c.profile_image_url}")` }}></div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{c.name}</p>
                                            <p className="text-xs text-gray-300 truncate">{c.appearance_tags?.[0]}</p>
                                        </div>
                                    </div>
                                ))}

                                <Button variant="ghost" className="w-full border-dashed border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500" onClick={() => {
                                    setCurrentCharacterId(null);
                                    setName('');
                                    setTags([]);
                                    setGeneratedImage(null);
                                }}>
                                    <Plus size={16} className="mr-2" /> New Character
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
