'use client';

import { useEffect } from 'react'; // Added useEffect
import { ZoomIn, ZoomOut, Move, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore, CanvasElement } from '@/store/useCanvasStore'; // Added CanvasElement
import CanvasElementRenderer from '@/components/editor/CanvasElementRenderer';
import api from '@/lib/api'; // Added api

export default function CanvasArea() {
    const { elements, selectedId, selectElement, activeEpisodeId, setElements } = useCanvasStore(); // Added activeEpisode and setElements

    useEffect(() => {
        const fetchCuts = async () => {
            if (!activeEpisodeId) return;
            try {
                const res = await api.get(`/cuts/?episode_id=${activeEpisodeId}`);
                const cuts = res.data;

                // Map cuts to Canvas Elements with vertical layout
                const newElements: CanvasElement[] = cuts.map((cut: any, index: number) => ({
                    id: cut.id, // Use cut ID as element ID for now to keep sync simple
                    type: 'image',
                    x: 100,
                    y: 50 + (index * 820), // Vertical spacing: 800 height + 20 gap
                    width: 600,
                    height: 800, // Default webtoon panel height
                    content: cut.image_path, // Image URL
                    prompt: cut.script
                })).filter((el: CanvasElement) => el.content); // Only show if image exists? Or show placeholder? Let's show only images for now.

                if (newElements.length > 0) {
                    setElements(newElements);
                }
            } catch (err) {
                console.error("Failed to load cuts to canvas", err);
            }
        };

        if (activeEpisodeId) {
            fetchCuts();
        }
    }, [activeEpisodeId, setElements]);

    return (
        <div className="h-full flex flex-col relative" onClick={() => selectElement(null)}>
            {/* Canvas Toolbar overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-[#13131c] p-1 rounded-lg backdrop-blur-sm border border-slate-700/50 shadow-xl">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" title="Move">
                    <Move size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" title="Hand Tool">
                    <Hand size={16} />
                </Button>
                <div className="h-px bg-slate-800 my-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" title="Zoom In">
                    <ZoomIn size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" title="Zoom Out">
                    <ZoomOut size={16} />
                </Button>
                <div className="h-px bg-slate-800 my-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                    title="Add Panel"
                    onClick={() => useCanvasStore.getState().addElement('panel')}
                >
                    <div className="w-4 h-4 border-2 border-current rounded-sm" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                    title="Add Text"
                    onClick={() => useCanvasStore.getState().addElement('text')}
                >
                    <span className="font-serif font-bold text-lg leading-none">T</span>
                </Button>
            </div>

            <div className="flex-1 bg-[#0a0a10] flex items-center justify-center p-8 overflow-auto custom-scrollbar">
                {/* Background Grid for Canvas Area too? Maybe subtle dots. */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px]"></div>

                <div className="w-[800px] h-[2000px] bg-white text-black shadow-2xl relative z-0" // Increased height for scrolling
                    onClick={(e) => { e.stopPropagation(); selectElement(null); }}>
                    {elements.map((el) => (
                        <CanvasElementRenderer
                            key={el.id}
                            element={el}
                            isSelected={el.id === selectedId}
                            onSelect={selectElement}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
