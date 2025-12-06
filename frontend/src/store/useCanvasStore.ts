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
    activeCharacter: { name: string; tags: string[] } | null; // Added
    addElement: (type: CanvasElement['type']) => void;
    selectElement: (id: string | null) => void;
    setActiveCharacter: (char: { name: string; tags: string[] } | null) => void; // Added
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    updateSelectedElement: (updates: Partial<CanvasElement>) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    elements: [
        // Initial Demo Panel
        { id: '1', type: 'panel', x: 50, y: 50, width: 300, height: 300, content: '', prompt: 'A futuristic city skyline' }
    ],
    selectedId: null,
    activeCharacter: null, // Init
    addElement: (type) => {
        const newElement: CanvasElement = {
            id: uuidv4(),
            type,
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            content: '',
            prompt: ''
        };
        set((state) => ({ elements: [...state.elements, newElement], selectedId: newElement.id }));
    },
    selectElement: (id) => set({ selectedId: id }),
    setActiveCharacter: (char) => set({ activeCharacter: char }), // Added
    updateElement: (id, updates) => set((state) => ({
        elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el))
    })),
    updateSelectedElement: (updates) => {
        const { selectedId, elements } = get();
        if (!selectedId) return;
        set({
            elements: elements.map(el => el.id === selectedId ? { ...el, ...updates } : el)
        });
    }
}));
