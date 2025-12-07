'use client';

import { CanvasElement } from '@/store/useCanvasStore';
import { cn } from '@/lib/utils';
import { Image as ImageIcon } from 'lucide-react';

interface CanvasElementRendererProps {
    element: CanvasElement;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

export default function CanvasElementRenderer({ element, isSelected, onSelect }: CanvasElementRendererProps) {
    // Simple absolute positioning for MVP. Draggable implementation would use mouse events here.

    return (
        <div
            className={cn(
                "absolute flex items-center justify-center overflow-hidden cursor-pointer transition-all",
                element.type === 'text' ? "bg-transparent" : "bg-white border-2",
                isSelected ? "border-purple-500 shadow-xl z-20" : "border-gray-300 hover:border-gray-400 z-10",
                element.type === 'text' && isSelected ? "border-2 border-dashed" : ""
            )}
            style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(element.id);
            }}
        >
            {element.type === 'text' ? (
                <div className="w-full h-full p-2 text-center flex items-center justify-center font-comic text-black leading-tight" contentEditable suppressContentEditableWarning>
                    {element.content || "Double click to edit"}
                </div>
            ) : element.content ? (
                <img src={element.content} alt="Generated" className="w-full h-full object-cover" />
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                    <ImageIcon size={32} className="mb-2 opacity-50" />
                    <span className="text-xs">{element.prompt || "No image"}</span>
                </div>
            )}

            {/* Selection Handles (Visual only for now) */}
            {isSelected && (
                <>
                    <div className="absolute top-0 left-0 w-2 h-2 bg-purple-500 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-purple-500 -translate-x-1/2 translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-purple-500 translate-x-1/2 translate-y-1/2" />
                </>
            )}
        </div>
    );
}
