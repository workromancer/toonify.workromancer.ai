'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PlusCircle } from 'lucide-react';

interface Template {
    id: string;
    title: string;
    description: string;
    style_preset: string;
    category: string;
    is_premium: boolean;
}

export default function TemplateList({ onSelect }: { onSelect: (template: Template | null) => void }) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/templates/');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleStartScratch = () => {
        onSelect(null); // Null implies scratch
    };

    if (loading) return <div>Loading templates...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Start from Scratch Card */}
            <div
                onClick={handleStartScratch}
                className="cursor-pointer border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30 hover:bg-gray-800 hover:border-purple-500 transition-all flex flex-col items-center justify-center p-6 gap-3 group h-48"
            >
                <div className="size-12 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-purple-600/20 group-hover:text-purple-400 transition-colors">
                    <PlusCircle size={28} />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-white">Start from Scratch</h3>
                    <p className="text-xs text-gray-400 mt-1">Empty canvas</p>
                </div>
            </div>

            {/* Template Cards */}
            {templates.map((template) => (
                <div
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className="cursor-pointer border border-gray-800 rounded-xl bg-gray-900 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all overflow-hidden group h-48 flex flex-col relative"
                >
                    {/* Premium Badge */}
                    {template.is_premium && (
                        <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/30">
                            PRO
                        </div>
                    )}

                    <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-700 group-hover:from-purple-900/40 group-hover:to-gray-800 transition-colors" />
                    <div className="p-4 flex flex-col justify-between flex-1">
                        <div>
                            <h3 className="font-semibold text-white text-sm truncate">{template.title}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-1">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">
                                {template.category}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
