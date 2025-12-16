'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import NewProjectModal from '@/components/dashboard/NewProjectModal';

interface Template {
    id: string;
    title: string;
    description: string;
    style_preset: string;
    category: string;
    is_premium: boolean;
    thumbnail_url?: string;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialValues, setModalInitialValues] = useState<{ style_preset?: string }>({});

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get('/templates');
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

    const categories = Array.from(new Set(templates.map(t => t.category)));

    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    const handleUseTemplate = (template: Template) => {
        setModalInitialValues({ style_preset: template.style_preset });
        setIsModalOpen(true);
    };

    // Placeholders for demo visuals if image_url missing
    const getPlaceholder = (id: string) => {
        const placeholders = [
            "https://lh3.googleusercontent.com/aida-public/AB6AXuC5unUUBklmleZaINqKPihiMZABdrDFVaalD2Xr5_WK6qMhp429XJ6mTMmx43i5lJHLJsvZ6nMWeafFmiuN4T_0T6T4Dzod9VBNG52SSa4f-8eU2lSiQnb7kYWMi_yH3yzZ9gOO-Y78kV25BagaLAtlZoq8XKid_1s4B1qXV-XBXmREmelhMI2TFbhphgwH6H1VrYO9_ARV_CqqfvhKmaNSggqe3T1fi_OCGhqBRSrsvkjq_yVQyZHldwKef6E96OTm5IwybcWbmeA",
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAd6YB98qgZSeKLbb0R9jo9kKtqYuijNs0wSJjmPCUTqWCitmEO-lZqyIrRfj1sV0UEwj6afnvIHxkCYwXSHKff_mMU0fF0bJsoIsBEqACS-H7KcEeHjIzZ68XOVjKyUwQxY3fJUWs5lRboKsfH8DWiY68kEI1nEAOmgskN8POzb1Xo0q_fjiINIYAmn7qTo1JQsV-4PnQxSFsf3Xr-heSV1yVUx_51Yhu2AMHiJiyT3CTkxCmPUhZQBzcGTV8E1P7OpppDlQaqRak",
            "https://lh3.googleusercontent.com/aida-public/AB6AXuArRgh4FppyC7ycoSM423Ewa5EFKujgv9fmaJGbvnRO-SQJT76GZ6BO9Eu4vT7UlyfhhzEHn_sCEHyvQ6SMWltpm18GHqrGDul59FGDjw3upIpo1aPlWg55zKTMIfz5HgAtr1RbckI9_XRvEGMq9eSQ0kR3JG-Fgyt7QZ6LpQDC14Zwap1NIK9zmB0JpsPpkJzAzH2bKt-8nxzIJtoYvDqOJYPRiynfxjonQ2nvzW7AU499qlSof4utONlzOh3D0f_eAhuyFT79brQ"
        ];
        // simple hash
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return placeholders[Math.abs(hash) % placeholders.length];
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Templates</h1>
                    <p className="text-gray-600 dark:text-gray-400">Choose a template to start your next masterpiece.</p>
                </header>

                {/* Filters */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    <Button
                        variant={selectedCategory === null ? "default" : "outline"}
                        onClick={() => setSelectedCategory(null)}
                        className="rounded-full"
                    >
                        All
                    </Button>
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"}
                            onClick={() => setSelectedCategory(cat)}
                            className="rounded-full capitalize"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTemplates.map(template => (
                            <div key={template.id} className="group cursor-pointer flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-lg transition-all" onClick={() => handleUseTemplate(template)}>
                                <div className="h-48 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
                                    <img
                                        src={template.thumbnail_url || getPlaceholder(template.id)}
                                        alt={template.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    {template.is_premium && (
                                        <div className="absolute top-2 right-2 z-20 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                                            PREMIUM
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{template.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">{template.description}</p>
                                    <Button className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary transition-colors">
                                        Use Template
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <NewProjectModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    initialValues={modalInitialValues}
                    onProjectCreated={() => { }} // Maybe redirect?
                />
            </div>
        </DashboardLayout>
    );
}
