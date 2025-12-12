'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    default_mood: string;
    profile_image_url?: string;
}

export default function CharacterListPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId as string;
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCharacters = async () => {
            if (!projectId) return;
            try {
                const res = await api.get(`/characters/?project_id=${projectId}`);
                setCharacters(res.data);
            } catch (err) {
                console.error("Failed to fetch characters", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCharacters();
    }, [projectId]);

    const handleNavigateToCasting = () => {
        router.push(`/project/${projectId}/casting`);
    };

    if (loading) {
        return <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
            {/* TopNavBar */}
            <header className="sticky top-0 z-10 flex w-full items-center justify-center border-b border-white/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm">
                <div className="flex w-full max-w-7xl items-center justify-between whitespace-nowrap px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <div className="size-6 text-primary">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                                <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
                            </svg>
                        </div>
                        <Link href={`/project/${projectId}`} className="text-lg font-bold leading-tight tracking-[-0.015em] hover:text-primary transition-colors">
                            Toonify
                        </Link>
                    </div>

                    <div className="flex flex-1 items-center justify-end gap-8">
                        <nav className="hidden items-center gap-9 md:flex">
                            <Link href={`/project/${projectId}`} className="text-sm font-medium leading-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Project Home</Link>
                            <Link href={`/project/${projectId}/characters`} className="text-sm font-medium leading-normal text-slate-900 dark:text-white">Characters</Link>
                            <Link href={`/project/${projectId}/storyboard`} className="text-sm font-medium leading-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Storyboard</Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <button className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined">light_mode</span>
                            </button>
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCV50u1f22p8P6wU-tL7vBSF4c8pQu0IQL21RDdrDXO3z2tPPfYFSnLyOCHCQplX1e5ZYCGL9iCbjDo9HoOHXdsCYR6pbuNzG8o-4CYaMnNXjiTaepUWsV3HBSUHn5qWrdQzq0TxJeiHNlNIJcoICUO6eHHjBMMCgP3sdXM79WdzyTCxSs5lHxVbfSklMiTCeuWnXr8jqgiDKPD8ESFk5x0j7LdVxsg5GeQTl3WgF1t1fVEFzqpwh65x3421LaXmVIlyJL_NNicB68")' }}></div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex h-full w-full flex-1 flex-col items-center py-10 sm:py-12 md:py-16">
                <div className="flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 sm:px-6 lg:px-8">
                    {/* PageHeading */}
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <p className="text-3xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white sm:text-4xl">All Characters</p>
                        </div>
                        <button
                            onClick={handleNavigateToCasting}
                            className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal text-white hover:bg-primary/90"
                        >
                            <span className="truncate">New Character</span>
                        </button>
                    </div>

                    {/* ImageGrid */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                        {characters.map((char) => (
                            <div key={char.id} className="relative group flex flex-col overflow-hidden rounded-xl border border-transparent hover:border-primary/50 dark:border-white/10 dark:hover:border-primary/50 transition-colors bg-slate-50 dark:bg-slate-800/20">
                                <div className="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover transition-transform duration-300 group-hover:scale-105 bg-slate-200 dark:bg-slate-700"
                                    style={char.profile_image_url ? { backgroundImage: `url("${char.profile_image_url}")` } : {}}
                                >
                                    {!char.profile_image_url && (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <span className="text-4xl font-bold opacity-30 text-slate-400 dark:text-slate-600">
                                                {char.name.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 p-4">
                                    <p className="text-base font-bold leading-normal text-slate-900 dark:text-white">{char.name}</p>
                                    <p className="text-sm font-normal leading-normal text-slate-600 dark:text-slate-400 capitalize">{char.default_mood}</p>
                                </div>
                            </div>
                        ))}

                        {/* Empty State / Add Card */}
                        <div
                            onClick={handleNavigateToCasting}
                            className="relative group flex flex-col items-center justify-center min-h-[300px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary cursor-pointer transition-colors"
                        >
                            <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-600 group-hover:text-primary transition-colors">add</span>
                            <span className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">Add Character</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
