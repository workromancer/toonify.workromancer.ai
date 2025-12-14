import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface CanvasElement {
    id: string;
    type: 'panel' | 'text' | 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    content?: string; // Image URL or Text
    prompt?: string; // AI Prompt
}

interface CanvasState {
    elements: CanvasElement[];
    selectedId: string | null;
    activeCharacter: { name: string; tags: string[]; profile_image_url?: string } | null;
    activeEpisodeId: string | null;
    activeCutId: string | null; // Added
    addElement: (type: CanvasElement['type']) => void;
    selectElement: (id: string | null) => void;
    setActiveCharacter: (char: { name: string; tags: string[]; profile_image_url?: string } | null) => void;
    setActiveEpisode: (id: string | null) => void;
    setActiveCut: (id: string | null) => void; // Added
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    updateSelectedElement: (updates: Partial<CanvasElement>) => void;
    setElements: (elements: CanvasElement[]) => void; // Added
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    elements: [],
    selectedId: null,
    activeCharacter: null,
    activeEpisodeId: null,
    activeCutId: null, // Init
    addElement: (type) => {
        const isText = type === 'text';
        const newElement: CanvasElement = {
            id: uuidv4(),
            type,
            x: 100,
            y: 100,
            width: isText ? 200 : 300,
            height: isText ? 100 : 300,
            content: isText ? 'Double click to edit' : '',
            prompt: ''
        };
        set((state) => ({ elements: [...state.elements, newElement], selectedId: newElement.id }));
    },
    selectElement: (id) => set({ selectedId: id }),
    setActiveCharacter: (char) => set({ activeCharacter: char }),
    setActiveEpisode: (id) => set({ activeEpisodeId: id }),
    setActiveCut: (id) => set({ activeCutId: id }), // Added
    updateElement: (id, updates) => set((state) => ({
        elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el))
    })),
    updateSelectedElement: async (updates) => {
        const { selectedId, elements, activeCutId } = get();

        // 1. Update Local State
        if (selectedId) {
            set({
                elements: elements.map(el => el.id === selectedId ? { ...el, ...updates } : el)
            });
        }

        // 2. Persist to Backend if activeCut exists
        if (activeCutId) {
            try {
                // Map local updates to API fields
                const apiUpdates: any = {};
                if (updates.prompt) apiUpdates.script = updates.prompt; // Mapping prompt to script for now, or new field? StoryCut has script.
                if (updates.content && updates.content.startsWith('http')) apiUpdates.image_path = updates.content;

                // If we are updating a Cut property via Inspector (like Ratio)
                if (updates.width && updates.height) {
                    // Infer ratio
                    const ratio = updates.width > updates.height ? "Wide" : updates.width < updates.height ? "Vertical" : "Square";
                    apiUpdates.aspect_ratio = ratio;
                }

                if (Object.keys(apiUpdates).length > 0) {
                    const api = (await import('@/lib/api')).default;
                    await api.put(`/cuts/${activeCutId}`, apiUpdates);
                }
            } catch (e) {
                console.error("Failed to sync cut update", e);
            }
        }
    },
    setElements: (elements) => set({ elements })
}));
