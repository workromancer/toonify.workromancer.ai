'use client';

import { ZoomIn, ZoomOut, Move, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CanvasArea() {
    return (
        <div className="h-full flex flex-col relative">
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
                <div className="w-[800px] h-[1200px] bg-white text-black shadow-2xl flex items-center justify-center relative">
                    <span className="text-gray-400 font-bold text-2xl select-none">Comic Page Canvas</span>
                    {/* Placeholder for panels */}
                    <div className="absolute top-10 left-10 w-40 h-40 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        Panel 1
                    </div>
                </div>
            </div>
        </div>
    );
}
