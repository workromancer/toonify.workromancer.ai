import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ArtStyleSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    currentStyle: string;
    onStyleUpdate: (newStyle: string) => void;
    projectTitle: string;
    projectGenre?: string;
}

interface StyleOption {
    id: string;
    name: string;
    imageUrl: string;
    isPreset: boolean;
}

// Preset styles from stitch/art_style_setup/01.html
const PRESET_STYLES: StyleOption[] = [
    {
        id: 'shonen_manga',
        name: 'Shonen Manga',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBo2-PAGHwNQ7VPowPJKfMRXliFwq49Kjx_C2CTIIs6XY5ubMc-gRmrgDdGhlE9nvKWeU50NPVud6ZshCA0OW67owZPEO5H9Tqrvu8gWQ_DTPDgWIDk2UoEuCFLLRHBmy3V-6D2Y8DujkFmY5a5nYKdmYJsUqkSQcNzG6ywmhmDJ80BWF9lJq4oIzNPxSYbXpCL64S_RSkT4f1Zq6jBVr8w3L5ozu9M4jOrVDNDgSo27eND1sXNPc6YV43IHaVgOxN3p0Pgd--Zw-8',
        isPreset: true
    },
    {
        id: 'shojo_manga',
        name: 'Shojo Manga',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcNqLoc_ZPNmK6FKo50EKvvxPLYL8yjBhJq_0BdrKbddp1Yx7Xi1V_mwwXJoHaROcVaRhrhxPvbjaPsLCp7hjaRsxQ00KpYoUVAxqXdPEtLCpWwCYyD2wpQ_zzYXtbO3U3Q8mtgIgoLrJGg0JMk5Yy-5fnq1IZXE9fdWN-62HXvFrv-qfX2e9vFelYLWIu76SuZgb-S_sNxkFxuXXFmynrX3gfOdplrJjUFswc8fdzk_l-CCC4dFLwq-w3RS5HjawZ2u7CfsVwzcE',
        isPreset: true
    },
    {
        id: 'chibi',
        name: 'Chibi',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAX2omh3i1iWKpqJDNXp-wSFhLk8HQCsaUr8W0K3rmYaOHPqvthcl2SwgCf2XyVr7kwQ1jnTwyp3pgAsaxytjS_eOHI30jMq0-zCIpJJehIYEFynvnELGiBtqlpcByieKf6oXX6Wyeavxry6EbNJAOhzc32-mUzCV_fMQW8xxWJvOuLYDkJXq8ClFIOjCY5oGUgrtMhSSmYVhJoWWJjJcsA_g33VkdOS4tqS4Y-0berAp1MuHEDPLEuFsp2780LCaHQuuF7fEPFgrA',
        isPreset: true
    },
    {
        id: 'painterly',
        name: 'Painterly',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe_WeQz4x4Rlmjr_bCL9tDGCze9KCTAiHJBc4KPMdqOe-NemkFOSDuABvOBoifBOBMTSwoCga7lFKsPxMEfI1K2v6rX47sKKdsUK2IpBn8fiaLOfetNdWWzBbj5WSAippUH7R4fbjiSd-tpluPauRL_N2wsK96Fl7S4iPNNeb0cY93hNE81icQKq0cgL1r6x1VKzGTs_NogpkAAv1E7TjKtwk7TpjN3t1b_rrplvsiJQALHIZiYpIQanNPpDtjkEX0_UfBMa6GCm0',
        isPreset: true
    },
    {
        id: 'sketch',
        name: 'Sketch',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8KjNnlPcGDFtLpNvaoiG_7qiZRoUQQB1t5va2uMxCp9lDHDbEsE5zIWfv6-P5dKIn9yvUDvxcn2hyXw90KTtbkvkMegJMSxk3hCXJxZYn_35jHdvW9N4BMGOmkb-fZHtqU3cDSuNVxdiyoyDV95zC0yqWe8_YSsZ9ADY4EJXOodyTnxlGFkoGOkYqaiX4-hsfFMFNkzaVsrDqHX8gtW3OttQVVarfhCu3ALZBMABvzwP6c3KnkMDpPNxigcJuegEkmYtIGZevajU',
        isPreset: true
    },
    {
        id: 'fantasy',
        name: 'Fantasy',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7Wcm1yy7RGlgLDKN6rTnZhC4l6EDonxetvvQcJ7k8ToISj7Ba1tBWYKMYDWrKG-zThgnkbDSWp-xdYpMmVprY2nAmgA9-7kt313c326T-rIJShisDoZ7ATK9LAeVn4L9y4R4Hxzy5q7X3IsE_mfzRFlRlzMr2aM85-DT1Tfdy6HSNP6niXhAFww7FmE9jQhX86leiTNxaexOXaUqkNHAwU_AeRItx8f7Cni_GWnKxHitcGF9q2U6dRHN_QwRCeNB8CBbBKJz79nw',
        isPreset: true
    },
    {
        id: 'sci_fi',
        name: 'Sci-Fi',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkJIvktsb4YF1JVsxZWH-fb1_OrGsQwSbl9D8xNTm3ildTgdbcO1s0pFh0ezKM52j5ML91t4ZCjHMZOM4KW-Zn3KlT0ELWVxwmCRfc-VOKtfW-IRQ18af1EH6AKFeKNHfcsaqULzBhLj2qixnTsjsfveEacSl6XDHxzISATheKyTRpguQGeJo8CDSofEZqx1avNuNDBvVWHUqQMS4eecNVminpqkGU3JQ4nmhRF2u8WZvwES3bDZ_W1DEzEv6NDyqHxLtei0oQLx8',
        isPreset: true
    },
    {
        id: 'noir',
        name: 'Noir',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDraQPY8H36LpK33hDV6_Z6thL9hDYLaJTf0ZcLWTYFCLUNCR1TKflT9CgeA5IRLCxSGbLYzV85dyxxlHxytyBtLKE9LSfFWF4qvGuHYtJCiEXWRtfkHeBqnnmKu_1mo1YyZ1uoQY35ea1xXVELF_zjbTvdrlAJnq3EQHus-VQEfeUWkC4i9w9V1ITuXR33h_C2eXnZBVRhG1v2xOOVvB4CYmK3iLv2nAXw5P43EqXuG-95nPzvURgG3FTFGw691bH3lF_q6elO1xk',
        isPreset: true
    },
    {
        id: 'retro',
        name: 'Retro',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvoAun5PuxSCzk5DsMUKfrQhT-l0ewPVch0TLLmrgiCf_St15tPfNEgR3N38nzucL4L-Yd8ibSlMyTZms1v1qTSGQ3IAbazEkGHJvyyuuBta5aeib63VxzwsLAmB8XEscpSbkgCNJ9dpaft-d1e_Jdwyek48zqTUsPxJ8ZV_4d0hRzopisyOob9YN8dK7kMSRTIsvoxnwGAtv5Pe2t8uRedGKEXDzE0CqlGvUgOxYQmOGeb4PzG9rt1pAARXrFqwHvMb1d7cOV7OY',
        isPreset: true
    },
    {
        id: 'webtoon',
        name: 'Webtoon',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD37jHcZr32eobg4fh1mlw-1GXv0nTWWCVrm41g537bHP9zCTsPLTZun0siNy-DUh9-36rydD-jxILwJjIygRmaXmSnWs75MVF29EsGEFLciH0sl_PeJDX7Y94JxzV5RX0mJzNnYmo71kXSWamtl3w3lCHF8guGjUp9NxeJ3ywOjap6X1xg8QrJF7XR1kO2cvHPokHT6DcxLjpJFKeydpezecIqUNYPyMHpz6vvCqeJJT444Kbp_fxY25SvCrm1lk1Y14SkDRDCzzk',
        isPreset: true
    }
];

export default function ArtStyleSetupModal({
    isOpen,
    onClose,
    projectId,
    currentStyle,
    onStyleUpdate,
    projectTitle,
    projectGenre
}: ArtStyleSetupModalProps) {
    const [selectedStyle, setSelectedStyle] = useState<string>(currentStyle);
    const [aiSuggestions, setAiSuggestions] = useState<StyleOption[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (currentStyle) {
                setSelectedStyle(currentStyle);
            } else if (aiSuggestions.length === 0) {
                // Fetch suggestions only if no style is currently selected and no suggestions exist
                fetchSuggestions();
            }
        }
    }, [isOpen, currentStyle]);

    const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            // Check if we already have suggestions or fetch them
            // Use the real endpoint: POST /projects/styles/recommend
            const description = `${projectTitle} ${projectGenre || ''}`;
            const res = await api.post('/projects/styles/recommend', { description: description });
            // Assuming response is list of strings or objects. 
            // Adjusted based on backend response_model which returns StyleRecommendResponse with 'styles' (checking ai_service.recommend_style implementation might be needed, but assuming a simple list for now from step 42 endpoint def says returns 'styles' variable)
            // Step 42: returns `styles` which is result of `ai_service.recommend_style`. Let's assume it returns a list of style names or objects.
            // If it returns strings, map them to StyleOption structure.
            // Check for options (from backend ai.py recommend_style structure) or styles (legacy)
            const suggestions = res.data.options || res.data.styles || (Array.isArray(res.data) ? res.data : []);

            const formattedSuggestions = suggestions.map((s: any) => ({
                id: s.id || (typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, '_') : `style_${Math.random().toString(36).substr(2, 9)}`),
                name: s.label || s.name || (typeof s === 'string' ? s : 'Unknown Style'),
                imageUrl: s.sample_image_url, // URL or undefined
                description: s.description, // Capture description if available
                isPreset: false
            }));
            setAiSuggestions(formattedSuggestions);

        } catch (err) {
            console.error("Failed to fetch AI suggestions", err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Find selected style object
            const styleObj = PRESET_STYLES.find(s => s.id === selectedStyle) || aiSuggestions.find(s => s.id === selectedStyle);
            const styleReferenceUrl = styleObj?.imageUrl;

            await api.patch(`/projects/${projectId}`, { 
                style_preset: selectedStyle,
                style_reference_url: styleReferenceUrl
            });
            onStyleUpdate(selectedStyle);
            onClose();
        } catch (err) {
            console.error("Failed to update style", err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#2c2c44] rounded-xl shadow-2xl relative text-white border border-[#5a5a7d]">

                {/* Header */}
                <header className="sticky top-0 z-10 bg-[#2c2c44]/95 backdrop-blur-md px-8 py-6 border-b border-[#5a5a7d]/50 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Art Style Selection</h2>
                        <p className="text-[#a9a9d1]">Choose the visual identity for your webtoon.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </header>

                <main className="p-8">
                    {/* Preset Styles */}
                    <section className="mb-10">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Preset Styles</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {PRESET_STYLES.map((style) => (
                                <div
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    className={cn(
                                        "relative group cursor-pointer rounded-xl overflow-hidden aspect-[3/4] transition-all duration-300",
                                        selectedStyle === style.id
                                            ? "ring-4 ring-[#8e44ad] scale-[1.02] shadow-[0_0_20px_rgba(142,68,173,0.5)]"
                                            : "hover:scale-[1.02] hover:shadow-xl ring-1 ring-white/10"
                                    )}
                                >
                                    {style.imageUrl ? (
                                        <img
                                            src={style.imageUrl}
                                            alt={style.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-gray-500">
                                            <span className="text-4xl opacity-20 font-black">{style.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                        <div className="flex justify-between items-center">
                                            <span className={cn("font-medium transition-colors", selectedStyle === style.id ? "text-[#8e44ad]" : "text-white")}>
                                                {style.name}
                                            </span>
                                            {selectedStyle === style.id && <Check className="text-[#8e44ad]" size={20} />}
                                        </div>
                                    </div>
                                    {/* Overlay for selection state */}
                                    {selectedStyle !== style.id && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* AI Suggestions */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">AI Suggestions <span className="font-normal text-[#a9a9d1] text-base ml-2">(Based on {projectTitle})</span></h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchSuggestions}
                                disabled={loadingSuggestions}
                                className="border-[#5a5a7d] text-[#a9a9d1] hover:text-white hover:bg-[#3d3d5c] bg-transparent"
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", loadingSuggestions && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>

                        {loadingSuggestions && aiSuggestions.length === 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-pulse">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-xl bg-white/5 aspect-video h-48"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {aiSuggestions.map((style) => (
                                    <div
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style.id)}
                                        className={cn(
                                            "relative group cursor-pointer rounded-xl overflow-hidden aspect-video transition-all duration-300",
                                            selectedStyle === style.id
                                                ? "ring-4 ring-[#8e44ad] scale-[1.02] shadow-[0_0_20px_rgba(142,68,173,0.5)]"
                                                : "hover:scale-[1.02] hover:shadow-xl ring-1 ring-white/10"
                                        )}
                                    >
                                        {style.imageUrl ? (
                                            <img
                                                src={style.imageUrl}
                                                alt={style.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center text-indigo-300/30">
                                                <span className="text-3xl font-bold">AI</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                            <div className="flex justify-between items-center">
                                                <span className={cn("font-medium transition-colors", selectedStyle === style.id ? "text-[#8e44ad]" : "text-white")}>
                                                    {style.name}
                                                </span>
                                                {selectedStyle === style.id && <Check className="text-[#8e44ad]" size={20} />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>

                <footer className="sticky bottom-0 bg-[#2c2c44]/95 backdrop-blur-md px-8 py-6 border-t border-[#5a5a7d]/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg border border-[#5a5a7d] text-[#a9a9d1] font-medium hover:bg-[#3d3d5c]/50 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 rounded-lg bg-[#4a4aff] hover:bg-[#4a4aff]/90 text-white font-semibold transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {saving ? 'Saving...' : 'Apply Style'}
                    </Button>
                </footer>
            </div>
        </div>
    );
}
