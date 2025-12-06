'use client';

import { ZoomIn, ZoomOut, Move, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/useCanvasStore';
import CanvasElementRenderer from '@/components/editor/CanvasElementRenderer';

export default function CanvasArea() {
    const { elements, selectedId, selectElement } = useCanvasStore();

    return (
        <div className="h-full flex flex-col relative" onClick={() => selectElement(null)}>
            {/* Canvas Toolbar overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-gray-800/80 p-1 rounded-md backdrop-blur-sm border border-gray-700">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white">
                    <Move size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white">
                    <Hand size={16} />
                </Button>
                <div className="h-px bg-gray-700 my-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white">
                    <ZoomIn size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white">
                    <ZoomOut size={16} />
                </Button>
            </div>

            <div className="flex-1 bg-gray-950 flex items-center justify-center p-8 overflow-auto">
                <div className="w-[800px] h-[1200px] bg-white text-black shadow-2xl relative"
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
