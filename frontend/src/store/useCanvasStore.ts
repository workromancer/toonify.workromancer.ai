import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// CanvasElement interface removed

interface CanvasState {
    activeCharacter: { name: string; tags: string[]; profile_image_url?: string } | null;
    activeEpisodeId: string | null;
    activeEpisodeStatus: string; // 'ready' | 'generating' | 'failed'
    activeCutId: string | null;
    setActiveCharacter: (char: { name: string; tags: string[]; profile_image_url?: string } | null) => void;
    setActiveEpisode: (id: string | null) => void;
    setActiveEpisodeStatus: (status: string) => void;
    setActiveCut: (id: string | null) => void;
    // Renamed for clarity since we don't have elements anymore, but keeping api for now
    updateCut: (updates: any) => Promise<void>;
    isReviewMode: boolean;
    setReviewMode: (isOpen: boolean) => void;
    generatingIdsSet: Set<string>;
    addGeneratingId: (id: string) => void;
    removeGeneratingId: (id: string) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    activeCharacter: null,
    activeEpisodeId: null,
    activeEpisodeStatus: 'ready',
    activeCutId: null,
    setActiveCharacter: (char) => set({ activeCharacter: char }),
    setActiveEpisode: (id) => set({ activeEpisodeId: id }),
    setActiveEpisodeStatus: (status) => set({ activeEpisodeStatus: status }),
    setActiveCut: (id) => set({ activeCutId: id }),
    isReviewMode: false,
    setReviewMode: (isOpen) => set({ isReviewMode: isOpen }),
    generatingIdsSet: new Set(),
    addGeneratingId: (id) => set((state) => ({ generatingIdsSet: new Set(state.generatingIdsSet).add(id) })),
    removeGeneratingId: (id) => set((state) => {
        const next = new Set(state.generatingIdsSet);
        next.delete(id);
        return { generatingIdsSet: next };
    }),

    updateCut: async (updates: any) => {
        const { activeCutId } = get();
        if (activeCutId) {
            try {
                // Map local updates to API fields if necessary
                const apiUpdates: any = { ...updates };
                // Example mappings if still needed, though Inspector passes direct values usually
                if (updates.prompt) apiUpdates.script = updates.prompt;

                const api = (await import('@/lib/api')).default;
                await api.put(`/cuts/${activeCutId}`, apiUpdates);
            } catch (e) {
                console.error("Failed to sync cut update", e);
            }
        }
    }
}));
