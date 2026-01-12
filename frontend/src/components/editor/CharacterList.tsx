'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { User, RefreshCw, Image as ImageIcon, X } from 'lucide-react';
import CharacterCreateModal from '@/components/editor/CharacterCreateModal';
import CharacterDetailModal from '@/components/project/modals/CharacterDetailModal';
import OutfitImageModal from '@/components/project/modals/OutfitImageModal';
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

// Independent outfit input component - each character has its own local state
interface OutfitInputProps {
    charKey: string;
    initialValue: string;
    hasReferenceBoard: boolean;
    isGenerating: boolean;
    onSave: (charName: string, value: string) => void;
}

function OutfitInput({ charKey, initialValue, hasReferenceBoard, isGenerating, onSave }: OutfitInputProps) {
    const [localValue, setLocalValue] = useState(initialValue);
    
    // Sync with external value only when initialValue changes (e.g., episode switch)
    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);
    
    const handleBlur = () => {
        if (localValue !== initialValue && localValue.trim()) {
            onSave(charKey, localValue);
        }
    };
    
    return (
        <input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder="의상 설명... (예: 검은 정장, 흰 셔츠)"
            disabled={hasReferenceBoard || isGenerating}
            className={`flex-1 px-2 py-1.5 bg-slate-900/50 border rounded text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed ${hasReferenceBoard ? 'border-amber-900/50' : 'border-slate-700'}`}
        />
    );
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

// Extended character interface for modal
interface FullCharacter {
    id?: string;
    name: string;
    description?: string;
    profile_image_url?: string;
    default_mood?: string | string[];
    sheet_status?: 'pending' | 'processing' | 'completed' | 'failed';
    appearance_tags?: string[];
    profile?: {
        age?: string;
        personality?: string;
        pros?: string[];
        cons?: string[];
        background?: string;
        features?: string[];
        bio?: {
            origin?: string;
            goals?: string;
            quirk?: string;
        } | string;
        stats?: Record<string, number>;
    };
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
    
    // Character detail modal state
    const [selectedCharacter, setSelectedCharacter] = useState<FullCharacter | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Outfit editing state
    const [outfits, setOutfits] = useState<Record<string, string>>({});
    const [outfitImages, setOutfitImages] = useState<Record<string, string>>({});
    const [hasReferenceBoard, setHasReferenceBoard] = useState(false);
    const [savingOutfit, setSavingOutfit] = useState<string | null>(null);
    const [generatingOutfits, setGeneratingOutfits] = useState<Set<string>>(new Set());  // Changed to Set for independent tracking
    const [generatingAll, setGeneratingAll] = useState(false);
    
    // Outfit image modal state (separate from character modal)
    const [outfitModalChar, setOutfitModalChar] = useState<{name: string, displayName: string} | null>(null);

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

    const handleCharacterClick = async (char: Character) => {
        // Set active character for canvas
        setActiveCharacter({ name: char.name, tags: char.appearance_tags, profile_image_url: char.profile_image_url });
        
        // Fetch full character data for modal
        try {
            const res = await api.get(`/characters/${char.id}`);
            setSelectedCharacter(res.data);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Failed to fetch character details', err);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedCharacter(null);
    };

    const handleCharacterDelete = (charId: string) => {
        fetchCharacters();
    };

    const handleCharacterRetry = async (charId: string) => {
        try {
            await api.post(`/characters/${charId}/generate`);
            fetchCharacters();
        } catch (err) {
            console.error('Failed to retry character generation', err);
        }
    };

    const fetchEpisodeData = async () => {
        if (!activeEpisodeId) {
            setEpisodeCharacterNames([]);
            setOutfits({});
            setOutfitImages({});
            setHasReferenceBoard(false);
            return;
        }
        try {
            const res = await api.get(`/episodes/${activeEpisodeId}`);
            const ep = res.data;
            const epOutfits = ep.character_outfits || {};
            setOutfits(epOutfits);
            setEpisodeCharacterNames(Object.keys(epOutfits).map(name => name.toLowerCase()));
            setOutfitImages(ep.character_outfit_images || {});
            setHasReferenceBoard(!!(ep.character_reference_board_urls && ep.character_reference_board_urls.length > 0));
        } catch (err) {
            console.error("Failed to fetch episode data", err);
            setEpisodeCharacterNames([]);
        }
    };
    
    const handleOutfitChange = (charName: string, value: string) => {
        const key = charName.toLowerCase();
        setOutfits(prev => ({ ...prev, [key]: value }));
    };
    
    const handleOutfitSave = async (charName: string) => {
        if (!activeEpisodeId || hasReferenceBoard) return;
        const key = charName.toLowerCase();
        setSavingOutfit(key);
        try {
            await api.put(`/episodes/${activeEpisodeId}`, { 
                character_outfits: outfits 
            });
        } catch (err) {
            console.error("Failed to save outfit", err);
        } finally {
            setSavingOutfit(null);
        }
    };
    
    const handleGenerateOutfit = async (charName: string) => {
        if (!activeEpisodeId) return;
        const key = charName.toLowerCase();
        
        // First save the outfit if changed
        if (!outfits[key]) return;
        
        // Add to generating set
        setGeneratingOutfits(prev => new Set(prev).add(key));
        const previousImageUrl = outfitImages[key];
        
        const removeFromGenerating = () => {
            setGeneratingOutfits(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        };
        
        try {
            console.log(`[Outfit Regen] Starting for ${key}`, { hasReferenceBoard, previousImageUrl });
            
            // Save first (only if reference board doesn't exist yet)
            if (!hasReferenceBoard) {
                console.log(`[Outfit Regen] Saving outfits first...`);
                await api.put(`/episodes/${activeEpisodeId}`, { 
                    character_outfits: outfits 
                });
            } else {
                console.log(`[Outfit Regen] Skipping outfit save (reference board exists)`);
            }
            
            // Then regenerate outfit image
            console.log(`[Outfit Regen] Calling regenerate API for ${key}...`);
            const regenResponse = await api.post(`/episodes/${activeEpisodeId}/regenerate-outfit-image/${encodeURIComponent(key)}`);
            console.log(`[Outfit Regen] API response:`, regenResponse.data);
            
            // Poll for result - check every 3 seconds until image changes or timeout
            let attempts = 0;
            const maxAttempts = 20; // 60 seconds max
            
            const pollForResult = async () => {
                attempts++;
                try {
                    const res = await api.get(`/episodes/${activeEpisodeId}`);
                    const newOutfitImages = res.data.character_outfit_images || {};
                    const newImageUrl = newOutfitImages[key];
                    
                    // Check if image URL changed (generation complete)
                    if (newImageUrl && newImageUrl !== previousImageUrl) {
                        // Only update THIS character's image to avoid overwriting other ongoing generations
                        setOutfitImages(prev => ({ ...prev, [key]: newImageUrl }));
                        removeFromGenerating();
                        console.log(`[Outfit] Successfully generated outfit for ${key}`);
                        return;
                    }
                    
                    // Check if we got an image for the first time
                    if (newImageUrl && !previousImageUrl) {
                        // Only update THIS character's image
                        setOutfitImages(prev => ({ ...prev, [key]: newImageUrl }));
                        removeFromGenerating();
                        console.log(`[Outfit] First outfit generated for ${key}`);
                        return;
                    }
                    
                    // Continue polling if not done yet
                    if (attempts < maxAttempts) {
                        setTimeout(pollForResult, 3000);
                    } else {
                        // Timeout - only update this character if we have a new image
                        if (newImageUrl) {
                            setOutfitImages(prev => ({ ...prev, [key]: newImageUrl }));
                        }
                        removeFromGenerating();
                        console.warn(`[Outfit] Timeout waiting for outfit generation for ${key}`);
                    }
                } catch (pollErr) {
                    console.error("Polling error", pollErr);
                    if (attempts < maxAttempts) {
                        setTimeout(pollForResult, 3000);
                    } else {
                        removeFromGenerating();
                    }
                }
            };
            
            // Start polling after initial delay
            setTimeout(pollForResult, 3000);
            
        } catch (err) {
            console.error("Failed to generate outfit", err);
            removeFromGenerating();
        }
    };
    
    const handleGenerateAllOutfits = async () => {
        if (!activeEpisodeId || Object.keys(outfits).length === 0) return;
        
        setGeneratingAll(true);
        try {
            // Save outfits first
            await api.put(`/episodes/${activeEpisodeId}`, { 
                character_outfits: outfits 
            });
            
            // Generate all outfit images
            await api.post(`/episodes/${activeEpisodeId}/generate-outfit-images`);
            
            // Poll for updates
            const pollInterval = setInterval(async () => {
                const res = await api.get(`/episodes/${activeEpisodeId}`);
                const newOutfitImages = res.data.character_outfit_images || {};
                setOutfitImages(newOutfitImages);
                
                // Check if all outfits are generated
                const outfitKeys = Object.keys(outfits);
                const generatedKeys = Object.keys(newOutfitImages);
                if (outfitKeys.every(k => generatedKeys.includes(k.toLowerCase()))) {
                    clearInterval(pollInterval);
                    setGeneratingAll(false);
                }
            }, 3000);

            // Timeout after 90 seconds
            setTimeout(() => {
                clearInterval(pollInterval);
                setGeneratingAll(false);
            }, 90000);
        } catch (err) {
            console.error("Failed to generate all outfits", err);
            setGeneratingAll(false);
        }
    };

    useEffect(() => {
        fetchCharacters();
    }, [projectId]);

    useEffect(() => {
        fetchEpisodeData();
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

    // Check if all characters have outfit definitions
    const allCharactersHaveOutfits = filteredCharacters.length > 0 && 
        filteredCharacters.every(c => outfits[c.name.toLowerCase()]?.trim());
    
    // Check if there are any outfit images
    const hasOutfitImages = Object.keys(outfitImages).length > 0;

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
                {/* Characters with Outfit Input */}
                <div className="px-2 py-2 space-y-2">
                    {loading ? (
                        <div className="text-slate-500 text-xs text-center py-4">{tl('loading') || 'Loading...'}</div>
                    ) : filteredCharacters.length === 0 ? (
                        <div className="text-slate-500 text-xs text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl m-2 italic">
                            {activeEpisodeId ? tl('episodeEmpty') : tl('empty')}
                        </div>
                    ) : (
                        filteredCharacters.map((char) => {
                            const charKey = char.name.toLowerCase();
                            const outfit = outfits[charKey] || '';
                            const outfitImage = outfitImages[charKey];
                            const isGenerating = generatingOutfits.has(charKey);
                            const isSaving = savingOutfit === charKey;
                            
                            return (
                                <div 
                                    key={char.id} 
                                    className={`rounded-lg border overflow-hidden transition-all ${
                                        isGenerating 
                                            ? 'border-purple-500 bg-purple-900/10 shadow-lg shadow-purple-900/20' 
                                            : 'border-slate-800 bg-[#15151A]'
                                    }`}
                                >
                                    {/* Character Info Row - Click opens outfit modal */}
                                    <div
                                        className={`p-2 transition-all group flex items-center gap-3 hover:bg-slate-800 cursor-pointer ${activeCharacter?.name === char.name ? 'bg-purple-900/20' : ''}`}
                                        onClick={() => {
                                            if (outfitImage) {
                                                setOutfitModalChar({ name: charKey, displayName: char.name });
                                            } else if (char.profile_image_url) {
                                                handleCharacterClick(char);
                                            }
                                        }}
                                    >
                                        {/* Thumbnail Image */}
                                        <div 
                                            className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border ${isGenerating ? 'border-purple-500' : 'border-slate-700'} ${!char.profile_image_url && !outfitImage && 'bg-slate-800 flex items-center justify-center'}`}
                                        >
                                            {outfitImage ? (
                                                <img src={outfitImage} alt={char.name} className={`w-full h-full object-cover ${isGenerating ? 'opacity-50' : ''}`} />
                                            ) : char.profile_image_url ? (
                                                <img src={char.profile_image_url} alt={char.name} className={`w-full h-full object-cover ${isGenerating ? 'opacity-50' : ''}`} />
                                            ) : (
                                                <User size={20} className="text-slate-500" />
                                            )}
                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                                                    <RefreshCw size={16} className="text-purple-400 animate-spin" />
                                                    <span className="text-[8px] text-purple-300 font-medium">생성중</span>
                                                </div>
                                            )}
                                            {/* Outfit image indicator badge */}
                                            {outfitImage && !isGenerating && (
                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                                    <span className="text-[8px] text-white">✓</span>
                                                </div>
                                            )}
                                            {/* Zoom icon on hover */}
                                            {(outfitImage || char.profile_image_url) && !isGenerating && (
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white text-xs">🔍</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Character Name & Tags */}
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-bold truncate ${activeCharacter?.name === char.name ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {char.name}
                                            </div>
                                            {isGenerating ? (
                                                <div className="text-[10px] text-purple-400 flex items-center gap-1">
                                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                                    아웃핏 이미지 생성 중...
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-500 truncate">
                                                    {char.appearance_tags.slice(0, 2).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Profile Icon - Hover visible, click opens profile modal */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCharacterClick(char);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-slate-700 hover:bg-purple-600 text-slate-400 hover:text-white shrink-0"
                                            title="프로필 보기"
                                        >
                                            <User size={14} />
                                        </button>
                                    </div>
                                    
                                    {/* Outfit Input Row (only when episode selected) */}
                                    {activeEpisodeId && (
                                        <div className="px-2 pb-2 pt-0">
                                            <div className="flex gap-1.5">
                                                <OutfitInput
                                                    charKey={charKey}
                                                    initialValue={outfit}
                                                    hasReferenceBoard={hasReferenceBoard}
                                                    isGenerating={isGenerating}
                                                    onSave={(key, value) => {
                                                        handleOutfitChange(char.name, value);
                                                        // Save after state update
                                                        setTimeout(() => handleOutfitSave(char.name), 0);
                                                    }}
                                                />
                                                {outfit && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleGenerateOutfit(char.name);
                                                        }}
                                                        disabled={isGenerating || generatingAll}
                                                        className={`px-2 py-1 rounded text-[10px] font-medium shrink-0 flex items-center gap-1 transition-all ${
                                                            isGenerating 
                                                                ? 'bg-purple-500 text-white animate-pulse' 
                                                                : outfitImage 
                                                                    ? 'bg-slate-700 hover:bg-purple-600 text-slate-300 hover:text-white' 
                                                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                                        } disabled:cursor-not-allowed`}
                                                        title={outfitImage ? "아웃핏 이미지 재생성" : "아웃핏 이미지 생성"}
                                                    >
                                                        {isGenerating ? (
                                                            <>
                                                                <RefreshCw size={10} className="animate-spin" />
                                                                <span className="hidden sm:inline">생성중</span>
                                                            </>
                                                        ) : outfitImage ? (
                                                            <RefreshCw size={10} />
                                                        ) : (
                                                            <ImageIcon size={10} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            {isSaving && (
                                                <div className="text-[9px] text-purple-400 mt-0.5">저장 중...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                
                {/* Generate All Outfits Button */}
                {activeEpisodeId && allCharactersHaveOutfits && !hasOutfitImages && (
                    <div className="px-3 pb-3">
                        <button
                            onClick={handleGenerateAllOutfits}
                            disabled={generatingAll}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                            {generatingAll ? (
                                <><RefreshCw size={12} className="animate-spin" /> 아웃핏 생성 중...</>
                            ) : (
                                <><ImageIcon size={12} /> 전체 아웃핏 이미지 생성</>
                            )}
                        </button>
                    </div>
                )}
                
                {/* Status message when images exist */}
                {activeEpisodeId && hasOutfitImages && (
                    <div className="px-3 pb-3">
                        <div className="text-[10px] text-slate-500 text-center italic">
                            ✓ 캐릭터 썸네일에 아웃핏 이미지가 적용되었습니다
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#0f0f16]">
                <CharacterCreateModal onCharacterCreated={fetchCharacters} />
            </div>

            {/* Character Detail Modal (Profile) */}
            <CharacterDetailModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                character={selectedCharacter}
                onDelete={handleCharacterDelete}
                onRetry={handleCharacterRetry}
            />
            
            {/* Outfit Image Modal (Separate) */}
            <OutfitImageModal
                isOpen={!!outfitModalChar}
                onClose={() => setOutfitModalChar(null)}
                characterName={outfitModalChar?.displayName || ''}
                outfitImageUrl={outfitModalChar ? outfitImages[outfitModalChar.name] : null}
                outfitDescription={outfitModalChar ? outfits[outfitModalChar.name] : undefined}
                onRegenerate={outfitModalChar ? () => {
                    handleGenerateOutfit(outfitModalChar.displayName);
                    setOutfitModalChar(null);
                } : undefined}
                isRegenerating={outfitModalChar ? generatingOutfits.has(outfitModalChar.name) : false}
            />
        </div>
    );
}

