'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sparkles, Tag, Layers, FileText } from 'lucide-react';
import api from '@/lib/api';

interface Genre {
    id: string;
    name: string;
    description?: string;
}

interface Project {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    style_preset: string;
    worldview?: any;
    genre_id?: string;
    genre?: string;
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
        worldview_content: '',
        style_preset: '',
        genre_id: ''
    });
    
    // Detailed Worldview Data
    const [tones, setTones] = useState<string[]>([]);
    const [keyFeatures, setKeyFeatures] = useState<string[]>([]);

    const [genres, setGenres] = useState<Genre[]>([]);
    const [loading, setLoading] = useState(false);
    const [genresLoading, setGenresLoading] = useState(false);

    // Initialize Data
    useEffect(() => {
        if (project) {
            // Parse Worldview
            let wvContent = '';
            let wvTones: string[] = [];
            let wvFeatures: string[] = [];

            if (project.worldview) {
                if (typeof project.worldview === 'string') {
                    wvContent = project.worldview;
                } else {
                    wvContent = project.worldview.content || project.worldview.description || '';
                    wvTones = Array.isArray(project.worldview.tone) ? project.worldview.tone : (project.worldview.tone ? [project.worldview.tone] : []);
                    wvFeatures = Array.isArray(project.worldview.key_features) ? project.worldview.key_features : [];
                }
            }

            setFormData({
                title: project.title || '',
                subtitle: project.subtitle || '',
                description: project.description || '',
                worldview_content: wvContent,
                style_preset: project.style_preset || '',
                genre_id: project.genre_id || ''
            });
            setTones(wvTones);
            setKeyFeatures(wvFeatures);
        }
    }, [project, isOpen]);

    // Fetch Genres
    useEffect(() => {
        if (isOpen && genres.length === 0) {
            setGenresLoading(true);
            api.get('/genres').then(res => {
                setGenres(res.data);
            }).catch(err => {
                console.error("Failed to fetch genres", err);
            }).finally(() => {
                setGenresLoading(false);
            });
        }
    }, [isOpen, genres.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Reconstruct worldview object
            const worldviewUpdate = {
                content: formData.worldview_content,
                tone: tones,
                key_features: keyFeatures
            };

            const response = await api.patch(`/projects/${project.id}`, {
                title: formData.title,
                subtitle: formData.subtitle,
                description: formData.description,
                worldview: worldviewUpdate,
                genre_id: formData.genre_id
                // Note: style_preset typically updated via setup, but can safeguard here if needed
            });
            onUpdate(response.data);
            onClose();
        } catch (error) {
            console.error("Failed to update project", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-[#1d1c27] text-white border-white/10 p-0 overflow-hidden gap-0">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-[#252433]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <SettingsIcon className="text-gray-400" /> Project Settings
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                             Manage metadata, genre, and storytelling elements.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Form Body - Scrollable */}
                <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-6">
                    
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} /> Basic Info
                        </h4>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right text-gray-300">Title</Label>
                                <Input 
                                    id="title" 
                                    value={formData.title} 
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                    className="col-span-3 bg-black/20 border-white/10 focus:border-[#4a4aff] text-white" 
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="subtitle" className="text-right text-gray-300">Subtitle</Label>
                                <Input 
                                    id="subtitle" 
                                    value={formData.subtitle} 
                                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} 
                                    className="col-span-3 bg-black/20 border-white/10 focus:border-[#4a4aff] text-white" 
                                />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="genre" className="text-right text-gray-300">Genre</Label>
                                <div className="col-span-3">
                                    <Select 
                                        value={formData.genre_id || "default"} 
                                        onValueChange={(val: string) => setFormData({...formData, genre_id: val === "default" ? "" : val})}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white w-full">
                                            <SelectValue placeholder="Select Genre" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#2c2c44] border-white/10 text-white">
                                            {genres.map(g => (
                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/5" />

                    {/* Worldview Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                             <Layers size={14} /> Worldview & Tone
                        </h4>
                        
                        {/* Description */}
                        <div>
                            <Label className="mb-2 block text-gray-300">World Description</Label>
                            <Textarea 
                                value={formData.worldview_content}
                                onChange={(e) => setFormData({ ...formData, worldview_content: e.target.value })}
                                className="min-h-[100px] bg-black/20 border-white/10 focus:border-[#4a4aff] text-white"
                                placeholder="Describe the setting..."
                            />
                        </div>

                        {/* Tones */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="mb-2 block text-gray-300 flex items-center gap-2"><Tag size={12}/> Tones</Label>
                                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-black/20 border border-white/5 min-h-[50px]">
                                    {tones.length > 0 ? tones.map((t, i) => (
                                        <span key={i} className="px-2 py-1 rounded bg-purple-500/20 text-purple-200 text-xs font-bold border border-purple-500/30">
                                            {t}
                                        </span>
                                    )) : <span className="text-gray-500 text-xs italic">No tones defined</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">Tones are generated by AI during concept phase.</p>
                            </div>
                            
                            {/* Key Features */}
                             <div>
                                <Label className="mb-2 block text-gray-300 flex items-center gap-2"><Sparkles size={12}/> Key Features</Label>
                                <div className="flex flex-col gap-2 p-3 rounded-lg bg-black/20 border border-white/5 min-h-[50px]">
                                    {keyFeatures.length > 0 ? keyFeatures.map((f, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                                            <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            {f}
                                        </div>
                                    )) : <span className="text-gray-500 text-xs italic">No features defined</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-[#252433] flex justify-end gap-3">
                     <Button type="button" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10" onClick={onClose}>Cancel</Button>
                     <Button type="submit" onClick={handleSubmit} disabled={loading} className="bg-[#4a4aff] hover:bg-[#3d3dcc] text-white shadow-lg shadow-blue-900/20">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}

function SettingsIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
