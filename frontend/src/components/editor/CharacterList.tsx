'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { User, RefreshCw, Image as ImageIcon, X } from 'lucide-react';
import CharacterCreateModal from '@/components/editor/CharacterCreateModal';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface Character {
    id: string;
    name: string;
    appearance_tags: string[];
    profile_image_url?: string;
}

interface OutfitImagesProps {
    episodeId: string | null;
    characters: Character[];
}

interface OutfitModalState {
    isOpen: boolean;
    charName: string;
    charDisplayName: string;
    imgUrl: string;
    outfit: string;
}

function OutfitImagesPanel({ episodeId, characters }: OutfitImagesProps) {
    const [outfitImages, setOutfitImages] = useState<Record<string, string>>({});
    const [outfits, setOutfits] = useState<Record<string, string>>({});
    const [hasReferenceBoard, setHasReferenceBoard] = useState(false);
    const [hasCuts, setHasCuts] = useState(false);
    const [loading, setLoading] = useState(false);
    const [regeneratingChar, setRegeneratingChar] = useState<string | null>(null);
    const [regeneratingAll, setRegeneratingAll] = useState(false);
    const [savingOutfit, setSavingOutfit] = useState(false);
    
    // Modal state
    const [modal, setModal] = useState<OutfitModalState>({
        isOpen: false,
        charName: '',
        charDisplayName: '',
        imgUrl: '',
        outfit: ''
    });
    const [editedOutfit, setEditedOutfit] = useState('');

    useEffect(() => {
        if (!episodeId) {
            setOutfitImages({});
            setOutfits({});
            setHasReferenceBoard(false);
            setHasCuts(false);
            return;
        }

        const fetchEpisode = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/episodes/${episodeId}`);
                const ep = res.data;
                setOutfitImages(ep.character_outfit_images || {});
                setOutfits(ep.character_outfits || {});
                setHasReferenceBoard(!!(ep.character_reference_board_urls && ep.character_reference_board_urls.length > 0));
                
                // Check if cuts have been generated
                const cutsRes = await api.get(`/cuts/${episodeId}`);
                const cuts = cutsRes.data || [];
                const hasGeneratedCuts = cuts.some((cut: any) => cut.image_path);
                setHasCuts(hasGeneratedCuts);
            } catch (e) {
                console.error("Failed to load episode outfit images", e);
            } finally {
                setLoading(false);
            }
        };
        fetchEpisode();
    }, [episodeId]);

    const openModal = (charName: string) => {
        const char = characters.find(c => c.name.toLowerCase() === charName);
        const outfit = outfits[charName] || '';
        setModal({
            isOpen: true,
            charName: charName,
            charDisplayName: char?.name || charName,
            imgUrl: outfitImages[charName] || '',
            outfit: outfit
        });
        setEditedOutfit(outfit);
    };

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleRegenerateOutfit = async () => {
        if (!episodeId || !modal.charName) return;
        setRegeneratingChar(modal.charName.toLowerCase());
        try {
            await api.post(`/episodes/${episodeId}/regenerate-outfit-image/${encodeURIComponent(modal.charName.toLowerCase())}`);
            setTimeout(async () => {
                const res = await api.get(`/episodes/${episodeId}`);
                const newImages = res.data.character_outfit_images || {};
                setOutfitImages(newImages);
                setModal(prev => ({ ...prev, imgUrl: newImages[modal.charName] || '' }));
                setRegeneratingChar(null);
            }, 6000);
        } catch (e) {
            console.error("Failed to regenerate outfit", e);
            setRegeneratingChar(null);
        }
    };

    const handleSaveOutfit = async () => {
        if (!episodeId || !modal.charName || hasCuts) return;
        setSavingOutfit(true);
        try {
            const updatedOutfits = { ...outfits, [modal.charName]: editedOutfit };
            await api.patch(`/episodes/${episodeId}`, { character_outfits: updatedOutfits });
            setOutfits(updatedOutfits);
            setModal(prev => ({ ...prev, outfit: editedOutfit }));
        } catch (e) {
            console.error("Failed to save outfit", e);
        } finally {
            setSavingOutfit(false);
        }
    };

    const handleRegenerateAll = async () => {
        if (!episodeId) return;
        setRegeneratingAll(true);
        try {
            await api.post(`/episodes/${episodeId}/regenerate-reference-board`);
            setTimeout(async () => {
                const res = await api.get(`/episodes/${episodeId}`);
                setOutfitImages(res.data.character_outfit_images || {});
                setHasReferenceBoard(!!(res.data.character_reference_board_urls && res.data.character_reference_board_urls.length > 0));
                setRegeneratingAll(false);
            }, 10000);
        } catch (e) {
            console.error("Failed to regenerate reference board", e);
            setRegeneratingAll(false);
        }
    };

    if (!episodeId) {
        return (
            <div className="px-3 py-4 text-center">
                <div className="text-slate-600 text-xs italic">
                    에피소드를 선택하면 아웃핏 이미지가 표시됩니다
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="px-3 py-4 text-center">
                <div className="text-slate-500 text-sm">로딩 중...</div>
            </div>
        );
    }

    if (!hasReferenceBoard || Object.keys(outfitImages).length === 0) {
        return (
            <div className="px-3 py-4">
                <div className="text-slate-600 text-xs text-center italic border border-dashed border-slate-800 rounded-lg p-3">
                    아직 생성된 아웃핏 이미지가 없습니다.
                    <br />
                    컷 이미지를 생성하면 자동으로 생성됩니다.
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="px-2 py-3 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon size={12} />
                        아웃핏 레퍼런스
                    </span>
                    <button
                        onClick={handleRegenerateAll}
                        disabled={regeneratingAll}
                        className="text-[10px] text-slate-500 hover:text-purple-400 disabled:text-slate-700 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                        <RefreshCw size={10} className={regeneratingAll ? 'animate-spin' : ''} />
                        {regeneratingAll ? '재생성 중...' : '전체 재생성'}
                    </button>
                </div>

                {/* Grid - 4 column gallery */}
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(outfitImages).map(([charName, imgUrl]) => {
                        const char = characters.find(c => c.name.toLowerCase() === charName);
                        
                        return (
                            <button 
                                key={charName}
                                onClick={() => openModal(charName)}
                                className="relative group aspect-square rounded-md overflow-hidden border border-slate-800 bg-slate-900/50 hover:border-purple-500/50 transition-colors cursor-pointer"
                            >
                                {imgUrl ? (
                                    <img 
                                        src={imgUrl} 
                                        alt={charName} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                        <User size={16} />
                                    </div>
                                )}
                                
                                {/* Character name overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                                    <div className="text-[10px] text-white font-bold capitalize truncate">
                                        {char?.name || charName}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="text-[10px] text-slate-600 text-center">
                    클릭하여 상세 보기 및 수정
                </div>
            </div>

            {/* Outfit Detail Modal */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={closeModal}>
                    <div 
                        className="bg-[#0f0f16] rounded-xl border border-slate-700 shadow-2xl w-[400px] max-h-[80vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                            <h3 className="text-sm font-bold text-white capitalize">{modal.charDisplayName}</h3>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white p-1">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4">
                            {/* Outfit Image */}
                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50">
                                {modal.imgUrl ? (
                                    <img src={modal.imgUrl} alt={modal.charDisplayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                        <User size={48} />
                                    </div>
                                )}
                                {regeneratingChar === modal.charName && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <RefreshCw size={24} className="text-purple-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Outfit Description */}
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                                    아웃핏 설명
                                    {hasCuts && (
                                        <span className="text-[10px] text-amber-500 flex items-center gap-1">
                                            🔒 수정 불가 (컷 생성됨)
                                        </span>
                                    )}
                                </label>
                                <textarea
                                    value={editedOutfit}
                                    onChange={(e) => setEditedOutfit(e.target.value)}
                                    disabled={hasCuts}
                                    className="w-full h-24 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-200 resize-none focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="캐릭터의 의상 설명..."
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/30">
                            {/* Save Button (only if not locked) */}
                            {!hasCuts && editedOutfit !== modal.outfit ? (
                                <Button
                                    onClick={handleSaveOutfit}
                                    disabled={savingOutfit}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                >
                                    {savingOutfit ? '저장 중...' : '저장'}
                                </Button>
                            ) : (
                                <div />
                            )}

                            {/* Regenerate Button */}
                            <Button
                                onClick={handleRegenerateOutfit}
                                disabled={regeneratingChar === modal.charName}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-xs"
                            >
                                <RefreshCw size={12} className={regeneratingChar === modal.charName ? 'animate-spin mr-1' : 'mr-1'} />
                                {regeneratingChar === modal.charName ? '재생성 중...' : '이미지 재생성'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

interface CharacterListProps {
    showHeader?: boolean;
}

export default function CharacterList({ showHeader = true }: CharacterListProps) {
    const tl = useTranslations('Project.Editor.CharacterList');
    const params = useParams();
    const projectId = params?.projectId as string;
    const [characters, setCharacters] = useState<Character[]>([]);
    const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
    const [episodeCharacterNames, setEpisodeCharacterNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { setActiveCharacter, activeCharacter, activeEpisodeId } = useCanvasStore();

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

    const fetchEpisodeCharacters = async () => {
        if (!activeEpisodeId) {
            setEpisodeCharacterNames([]);
            return;
        }
        try {
            const res = await api.get(`/episodes/${activeEpisodeId}`);
            const outfits = res.data.character_outfits || {};
            setEpisodeCharacterNames(Object.keys(outfits).map(name => name.toLowerCase()));
        } catch (err) {
            console.error("Failed to fetch episode characters", err);
            setEpisodeCharacterNames([]);
        }
    };

    useEffect(() => {
        fetchCharacters();
    }, [projectId]);

    useEffect(() => {
        fetchEpisodeCharacters();
    }, [activeEpisodeId]);

    useEffect(() => {
        if (episodeCharacterNames.length === 0) {
            setFilteredCharacters(characters);
        } else {
            const filtered = characters.filter(char => 
                episodeCharacterNames.includes(char.name.toLowerCase())
            );
            setFilteredCharacters(filtered);
        }
    }, [characters, episodeCharacterNames]);

    return (
        <div className="flex flex-col h-full bg-[#0f0f16]">
            {/* Character List Section Header - Conditionally rendered */}
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider">{tl('title')}</h3>
                    <span className="text-xs text-slate-500 font-mono">{filteredCharacters.length}</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Characters */}
                <div className="px-2 py-2 space-y-2">
                    {loading ? (
                        <div className="text-slate-500 text-xs text-center py-4">{tl('loading') || 'Loading...'}</div>
                    ) : filteredCharacters.length === 0 ? (
                        <div className="text-slate-500 text-xs text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl m-2 italic">
                            {activeEpisodeId ? tl('episodeEmpty') : tl('empty')}
                        </div>
                    ) : (
                        filteredCharacters.map((char) => (
                            <div
                                key={char.id}
                                className={`p-2 rounded-lg cursor-pointer transition-all group border flex items-center gap-3 ${activeCharacter?.name === char.name
                                    ? 'bg-purple-900/20 border-purple-500/50'
                                    : 'bg-[#15151A] border-transparent hover:bg-slate-800 hover:border-slate-700'
                                    }`}
                                onClick={() => setActiveCharacter({ name: char.name, tags: char.appearance_tags, profile_image_url: char.profile_image_url })}
                                title={char.appearance_tags.join(', ')}
                            >
                                <div className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-700 ${!char.profile_image_url && 'bg-slate-800 flex items-center justify-center'}`}>
                                    {char.profile_image_url ? (
                                        <img src={char.profile_image_url} alt={char.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={16} className="text-slate-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-bold truncate ${activeCharacter?.name === char.name ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                        {char.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                        {char.appearance_tags.slice(0, 2).join(', ')}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Outfit Images Section (Episode-specific) */}
                <div className="border-t border-slate-800 mt-2">
                    <OutfitImagesPanel episodeId={activeEpisodeId} characters={filteredCharacters} />
                </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#0f0f16]">
                <CharacterCreateModal onCharacterCreated={fetchCharacters} />
            </div>
        </div>
    );
}
