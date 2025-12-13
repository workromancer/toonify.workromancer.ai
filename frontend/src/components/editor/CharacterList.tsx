'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { User, Wand2 } from 'lucide-react'; // Added Wand2
import CharacterCreateModal from '@/components/editor/CharacterCreateModal';
import { useCanvasStore } from '@/store/useCanvasStore';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    profile_image_url?: string;
}

export default function CharacterList() {
    const params = useParams();
    const projectId = params?.projectId as string;
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState<string | null>(null); // Added state
    const { setActiveCharacter, activeCharacter } = useCanvasStore();

    const handleGenerate = async (charId: string) => {
        setGeneratingId(charId);
        try {
            await api.post(`/characters/${charId}/generate`);
            fetchCharacters(); // Refresh list to show new image
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingId(null);
        }
    };


    const fetchCharacters = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const res = await api.get(`/characters/?project_id=${projectId}`);
            setCharacters(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCharacters();
    }, [projectId]);

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-semibold mb-4 text-gray-300 px-4 pt-4">Characters</h3>

            <div className="flex-1 overflow-y-auto px-4 space-y-2">
                {loading ? (
                    <div className="text-gray-500 text-sm">Loading...</div>
                ) : characters.length === 0 ? (
                    <div className="text-gray-500 text-sm italic">No characters yet.</div>
                ) : (
                    characters.map((char) => (
                        <div
                            key={char.id}
                            className={`p-3 border rounded cursor-pointer transition-colors group flex items-center gap-3 ${activeCharacter?.name === char.name
                                ? 'bg-purple-900/40 border-purple-500'
                                : 'bg-gray-700/50 hover:bg-gray-700 border-transparent hover:border-gray-500'
                                }`}
                            onClick={() => setActiveCharacter({ name: char.name, tags: char.appearance_tags, profile_image_url: char.profile_image_url })}
                            title={char.appearance_tags.join(', ')}
                        >
                            <div className="relative w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                                {char.profile_image_url ? (
                                    <img src={char.profile_image_url} alt={char.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={16} className="text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-200 truncate group-hover:text-white">
                                    {char.name}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerate(char.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Generate Profile Image"
                                    disabled={generatingId === char.id}
                                >
                                    {generatingId === char.id ? (
                                        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Wand2 size={14} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                <CharacterCreateModal onCharacterCreated={fetchCharacters} />
            </div>
        </div>
    );
}
