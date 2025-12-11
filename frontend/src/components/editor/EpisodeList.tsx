'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import EpisodeGenerationModal from './EpisodeGenerationModal';
import { Sparkles } from 'lucide-react';


interface Episode {
    id: string;
    title: string;
    episode_order: number;
}

export default function EpisodeList() {
    const params = useParams();
    const projectId = params?.projectId as string;
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const { setActiveEpisode, activeEpisodeId } = useCanvasStore(); // Use store


    const fetchEpisodes = async () => {
        if (!projectId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await api.get(`/episodes/?project_id=${projectId}`);
            setEpisodes(res.data);
        } catch (err) {
            console.error("Fetch Episodes Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const [creating, setCreating] = useState(false);

    const createEpisode = async () => {
        if (creating) return;
        try {
            setCreating(true);
            const nextNumber = episodes.length > 0 ? episodes[episodes.length - 1].episode_order + 1 : 1;
            await api.post('/episodes/', {
                title: `Episode ${nextNumber}`,
                project_id: projectId,
                episode_order: nextNumber
            });
            await fetchEpisodes();
        } catch (err) {
            console.error("Failed to create episode", err);
        } finally {
            setCreating(false);
        }
    }

    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

    const handleDeleteConfirm = async (id: string) => {
        try {
            await api.delete(`/episodes/${id}`);
            if (activeEpisodeId === id) setActiveEpisode(null);
            fetchEpisodes();
        } catch (err) {
            console.error("Failed to delete episode", err);
        }
    };

    const [genModalOpen, setGenModalOpen] = useState(false);

    const handleEpisodeCreated = async (newItemId: string) => {
        await fetchEpisodes();
        setActiveEpisode(newItemId);
    };

    useEffect(() => {
        fetchEpisodes();
    }, [projectId]);

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-semibold mb-4 text-gray-300 px-4 pt-4">Episodes</h3>

            <div className="flex-1 overflow-y-auto px-4 space-y-2">
                {loading ? (
                    <div className="text-gray-500 text-sm">Loading...</div>
                ) : episodes.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-500 text-sm italic mb-4">No episodes yet.</div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-gray-800 border-gray-700 text-purple-400 hover:text-purple-300 hover:bg-gray-700 hover:border-purple-500"
                            onClick={() => setGenModalOpen(true)}
                        >
                            <Sparkles size={14} className="mr-2" /> Auto-Generate
                        </Button>
                    </div>
                ) : (
                    episodes.map((ep) => (
                        <div
                            key={ep.id}
                            data-testid={`episode-item-${ep.id}`}
                            className={`p-3 border rounded cursor-pointer transition-colors group flex justify-between items-center ${activeEpisodeId === ep.id
                                ? 'bg-purple-900/40 border-purple-500'
                                : 'bg-gray-700/50 hover:bg-gray-700 border-transparent hover:border-gray-500'
                                }`}
                            onClick={() => setActiveEpisode(ep.id)}
                        >
                            <span className="text-sm font-medium text-gray-200">{ep.title}</span>
                            <ConfirmationDialog
                                open={deleteConfirmationId === ep.id}
                                onOpenChange={(open) => !open && setDeleteConfirmationId(null)}
                                title="Delete Episode?"
                                description="Are you sure you want to delete this episode? This action cannot be undone and all cuts will be lost."
                                onConfirm={() => handleDeleteConfirm(ep.id)}
                                variant="destructive"
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-gray-800"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirmationId(ep.id);
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                }
                            />
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-700 space-y-2">
                <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-purple-900/50 hover:bg-purple-900 text-purple-200 border border-purple-800"
                    onClick={() => setGenModalOpen(true)}
                >
                    <Sparkles size={16} className="mr-2" /> Generate with AI
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    data-testid="add-episode-btn"
                    className="w-full text-gray-400 border border-dashed border-gray-600 hover:text-white hover:border-gray-500 hover:bg-gray-700"
                    onClick={createEpisode}
                    disabled={creating}
                >
                    {creating ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                        <Plus size={16} className="mr-2" />
                    )}
                    {creating ? 'Creating...' : 'Empty Episode'}
                </Button>
            </div>

            <EpisodeGenerationModal
                isOpen={genModalOpen}
                onClose={() => setGenModalOpen(false)}
                projectId={projectId}
                onEpisodeCreated={handleEpisodeCreated}
            />
        </div>
    );
}
