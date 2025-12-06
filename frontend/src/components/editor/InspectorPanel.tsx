'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function InspectorPanel() {
    return (
        <div className="p-4 space-y-6">
            <div>
                <h3 className="font-semibold mb-4 text-gray-300">Properties</h3>
                <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="element-name">Name</Label>
                        <Input id="element-name" placeholder="Panel 1" />
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="width">Width</Label>
                        <div className="flex gap-2">
                            <Input id="width" placeholder="800" />
                            <span className="text-gray-500 py-2">px</span>
                        </div>
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="height">Height</Label>
                        <div className="flex gap-2">
                            <Input id="height" placeholder="600" />
                            <span className="text-gray-500 py-2">px</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
                <h3 className="font-semibold mb-4 text-gray-300">AI Generation</h3>
                <div className="p-4 bg-purple-900/20 rounded-md border border-purple-500/20 text-sm text-purple-200">
                    Select a panel to generate image content.
                </div>
            </div>
        </div>
    );
}
