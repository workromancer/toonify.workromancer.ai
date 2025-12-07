'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/dashboard/ProjectCard';
import api from '@/lib/api';
import NewProjectModal from '@/components/dashboard/NewProjectModal';
import TemplateList from '@/components/dashboard/TemplateList';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface Project {
    id: string;
    title: string;
    style_preset: string;
    created_at: string;
    thumbnail_url?: string;
}

export default function DashboardPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { user } = useAuthStore();

    // Modal State
    const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
    const [modalInitialValues, setModalInitialValues] = useState<{ style_preset?: string }>({});

    const fetchProjects = async () => {
        try {
            if (projects.length === 0) setLoading(true); // Only show loading on initial fetch or empty
            const res = await api.get('/projects/');
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleTemplateSelect = (template: any | null) => {
        if (template) {
            setModalInitialValues({ style_preset: template.style_preset });
        } else {
            setModalInitialValues({});
        }
        setIsInternalModalOpen(true);
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Header with Search and New Project */}
                <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex min-w-72 flex-col gap-2">
                        <h1 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                            Welcome back, {user?.email?.split('@')[0] || "Artist"}!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">
                            Start a new webtoon or pick up where you left off.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="flex-1 md:flex-initial md:w-72">
                            <div className="relative flex items-center w-full h-12 rounded-xl bg-white dark:bg-background-dark border border-gray-300 dark:border-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
                                <div className="grid place-items-center h-full w-12 text-gray-500 dark:text-gray-400">
                                    <Search size={20} />
                                </div>
                                <input
                                    className="peer h-full w-full outline-none text-sm text-gray-900 dark:text-white pr-4 bg-transparent placeholder-gray-400 dark:placeholder-gray-500"
                                    type="text"
                                    placeholder="Search projects..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* New Project Button */}
                        <Button
                            onClick={() => handleTemplateSelect(null)}
                            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm gap-2 shadow-sm transition-colors"
                        >
                            <Plus size={20} />
                            <span className="truncate">New Project</span>
                        </Button>
                    </div>
                </header>

                {/* Recent Projects Section */}
                <section>
                    <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4 pt-2">
                        Recent Projects
                    </h2>
                    {loading ? (
                        <div className="text-gray-500">Loading projects...</div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-lg">No projects found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                            {filteredProjects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Start New Toon Section */}
                <section className="mt-10">
                    <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">
                        Start a New Toon
                    </h2>
                    <TemplateList onSelect={handleTemplateSelect} />
                </section>

                {/* Controlled Modal */}
                <NewProjectModal
                    open={isInternalModalOpen}
                    onOpenChange={setIsInternalModalOpen}
                    onProjectCreated={fetchProjects}
                    initialValues={modalInitialValues}
                />
            </div>
        </DashboardLayout>
    );
}
