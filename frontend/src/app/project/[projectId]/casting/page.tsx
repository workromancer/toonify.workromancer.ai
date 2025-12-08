'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    default_mood: string;
    profile_image_url?: string;
}

export default function CharacterCastingPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId as string;

    // State
    const [name, setName] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [style, setStyle] = useState('Shonen'); // Default, maybe fetch from project?
    const [mood, setMood] = useState('neutral');

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);

    const [cast, setCast] = useState<Character[]>([]);

    useEffect(() => {
        // Fetch existing cast for Right Column
        const fetchCast = async () => {
            if (!projectId) return;
            try {
                const res = await api.get(`/characters/?project_id=${projectId}`);
                setCast(res.data);
            } catch (err) {
                console.error("Failed to fetch cast", err);
            }
        };
        fetchCast();
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
            alert("Please enter a character name");
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
                // Update if already exists
                await api.patch(`/characters/${charId}`, {
                    name,
                    appearance_tags: tags,
                    default_mood: mood
                });
            }

            // 2. Generate Image
            const genRes = await api.post(`/characters/${charId}/generate`);
            setGeneratedImage(genRes.data.profile_image_url);

            // Refresh cast list to show new char (if already saved)
            // fetchCast(); // Optional

        } catch (err) {
            console.error("Generation failed", err);
            alert("Failed to generate character. See console.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAndExit = () => {
        if (!currentCharacterId) {
            // If never generated, maybe create now?
            // For now require generation first or just plain create
            if (name) {
                // allow saving without generation
                handleGenerate().then(() => router.push(`/project/${projectId}/characters`));
                return;
            }
            alert("Create a character first");
            return;
        }
        router.push(`/project/${projectId}/characters`);
    };

    return (
        <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-dark dark group/design-root overflow-hidden font-display text-white">
            {/* TopNavBar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#292348] px-6 py-3 shrink-0">
                <div className="flex items-center gap-4 text-white">
                    <div className="size-6 text-white">
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                            <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
                        </svg>
                    </div>
                    <Link href={`/project/${projectId}`} className="text-lg font-bold leading-tight tracking-[-0.015em]">Toonify</Link>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveAndExit}
                            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#292348] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#3b3267] transition-colors"
                        >
                            <span className="truncate">Save & Exit</span>
                        </button>
                    </div>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCV50u1f22p8P6wU-tL7vBSF4c8pQu0IQL21RDdrDXO3z2tPPfYFSnLyOCHCQplX1e5ZYCGL9iCbjDo9HoOHXdsCYR6pbuNzG8o-4CYaMnNXjiTaepUWsV3HBSUHn5qWrdQzq0TxJeiHNlNIJcoICUO6eHHjBMMCgP3sdXM79WdzyTCxSs5lHxVbfSklMiTCeuWnXr8jqgiDKPD8ESFk5x0j7LdVxsg5GeQTl3WgF1t1fVEFzqpwh65x3421LaXmVIlyJL_NNicB68")' }}></div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                <div className="grid grid-cols-12 flex-1">
                    {/* Left Column (Controls) */}
                    <div className="col-span-3 flex flex-col border-r border-[#292348] overflow-y-auto bg-[#131022]">
                        <div className="p-6">
                            <div className="flex min-w-72 flex-col gap-2">
                                <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">New Character Casting</p>
                                <p className="text-[#9b92c9] text-base font-normal leading-normal">Define the new character's traits, and the AI will generate the character in real-time.</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 space-y-6 flex-1">
                            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pt-2">Define Your Character</h2>

                            {/* Character Name */}
                            <div className="flex flex-col">
                                <label className="text-white text-base font-medium leading-normal pb-2">Character Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3b3267] bg-[#1e1933] focus:border-[#3b3267] h-14 placeholder:text-[#9b92c9] p-[15px] text-base font-normal leading-normal"
                                    placeholder="e.g., Kaelen Shadowblade"
                                />
                            </div>

                            {/* Appearance Tags */}
                            <div className="flex flex-col">
                                <label className="text-white text-base font-medium leading-normal pb-2">Appearance Tags</label>
                                <div className="flex items-center w-full min-w-0 rounded-lg border border-[#3b3267] bg-[#1e1933] focus-within:border-primary p-2 flex-wrap gap-2">
                                    {tags.map((tag, idx) => (
                                        <div key={idx} className="flex h-8 shrink-0 items-center justify-center gap-x-1 rounded-lg bg-[#292348] pl-3 pr-2">
                                            <p className="text-white text-sm font-medium leading-normal">{tag}</p>
                                            <button onClick={() => removeTag(idx)} className="text-white/70 hover:text-white">
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    <input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        className="form-input flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-[#9b92c9] min-w-[120px] outline-none"
                                        placeholder="Add a tag..."
                                    />
                                </div>
                            </div>

                            {/* Style Preset (Mock for now) */}
                            <div className="flex flex-col">
                                <label className="text-white text-base font-medium leading-normal pb-2">Style Preset</label>
                                <div className="relative">
                                    <select
                                        value={style}
                                        onChange={(e) => setStyle(e.target.value)}
                                        className="form-select appearance-none w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3b3267] bg-[#1e1933] focus:border-[#3b3267] h-14 p-[15px] text-base font-normal leading-normal"
                                    >
                                        <option value="Shonen">Shonen</option>
                                        <option value="Shojo">Shojo</option>
                                        <option value="Fantasy">Fantasy</option>
                                        <option value="Sci-fi">Sci-fi</option>
                                    </select>
                                    <span className="material-symbols-outlined text-[#9b92c9] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {/* Current Mood */}
                            <div className="flex flex-col">
                                <label className="text-white text-base font-medium leading-normal pb-2">Current Mood</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {['happy', 'neutral', 'sad', 'angry'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setMood(m)}
                                            className={`flex flex-col items-center justify-center gap-2 rounded-lg p-3 aspect-square bg-[#292348] border-2 ${mood === m ? 'border-primary text-white' : 'border-transparent hover:border-primary/50 text-[#9b92c9] hover:text-white'}`}
                                        >
                                            <span className="material-symbols-outlined !text-4xl capitalize">{m === 'happy' ? 'sentiment_very_satisfied' : m === 'neutral' ? 'sentiment_neutral' : m === 'sad' ? 'sentiment_sad' : 'sentiment_frustrated'}</span>
                                            <p className="text-sm capitalize">{m}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 mt-auto">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`flex w-full items-center justify-center gap-2 rounded-lg h-14 px-4 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="material-symbols-outlined">{isGenerating ? 'hourglass_empty' : 'auto_awesome'}</span>
                                <span className="truncate">{isGenerating ? 'Generating...' : 'Generate'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Center Column (Canvas) */}
                    <div className="col-span-6 flex items-center justify-center p-8 bg-[#100e1c]">
                        <div className="w-full max-w-2xl aspect-[3/4] rounded-xl bg-[#1e1933] border-2 border-dashed border-[#292348] flex flex-col items-center justify-center text-center relative group overflow-hidden">
                            {generatedImage ? (
                                <img
                                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                    src={generatedImage}
                                    alt="Generated Character"
                                />
                            ) : (
                                <div className="text-[#9b92c9]">
                                    <span className="material-symbols-outlined text-6xl mb-4">image</span>
                                    <p>Character preview will appear here</p>
                                </div>
                            )}

                            {/* Overlay Actions */}
                            {generatedImage && (
                                <>
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button onClick={handleGenerate} className="flex items-center justify-center gap-2 h-12 px-5 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-white/20">
                                            <span className="material-symbols-outlined">refresh</span>
                                            Vary
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column (Context) */}
                    <div className="col-span-3 flex flex-col border-l border-[#292348] overflow-y-auto bg-[#131022]">
                        <div className="p-6">
                            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Project Cast</h2>
                        </div>
                        <div className="px-6 space-y-4">
                            {cast.map((c) => (
                                <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-[#1e1933] cursor-pointer hover:bg-[#292348]">
                                    <div className="size-16 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url("${c.profile_image_url || 'https://via.placeholder.com/100'}")` }}></div>
                                    <p className="text-white font-medium">{c.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
