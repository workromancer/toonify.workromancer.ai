'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { User } from 'lucide-react';
import CharacterCreateModal from '@/components/editor/CharacterCreateModal';
import { useCanvasStore } from '@/store/useCanvasStore'; // Import store

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    profile_image_url?: string;
}

export default function CharacterList() {
    const { projectId } = useParams();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const { setActiveCharacter, activeCharacter } = useCanvasStore(); // Use store

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
                            onClick={() => setActiveCharacter({ name: char.name, tags: char.appearance_tags })}
                            title={char.appearance_tags.join(', ')}
                        >
                            <div className="w-8 h-8 rounded-
