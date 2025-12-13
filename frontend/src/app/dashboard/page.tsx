'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/dashboard/ProjectCard';
import api from '@/lib/api';
import TemplateList from '@/components/dashboard/TemplateList';
import { useRouter } from 'next/navigation';
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

    const router = useRouter();

    const handleTemplateSelect = (template: any | null) => {
        if (template) {
            router.push('/new-project');
        } else {
            router.push('/new-project');
        }
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-6 md:p-8 relative z-10">
                {/* Ambient Background for Dashboard */}
                <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

                {/* Header with Search and New Project */}
                <header className="flex flex-wrap items-center justify-between gap-4 mb-10 relative">
                    <div className="flex min-w-72 flex-col gap-2">
                        <h1 className="text-white text-3xl md:text-5xl font-black leading-tight tracking-[-0.033em] mb-1">
                            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{user?.email?.split('@')[0] || "Artist"}</span>!
                        </h1>
                        <p className="text-gray-400 text-lg font-light">
                            Start a new webtoon or pick up where you left off.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="flex-1 md:flex-initial md:w-80">
                            <div className="relative flex items-center w-full h-14 rounded-2xl bg-[#0F0F12] border border-gray-800 backdrop-blur-md focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-lg hover:bg-[#15151A]">
                                <div className="grid place-items-center h-full w-14 text-gray-400">
                                    <Search size={22} />
                                </div>
                                <input
                                    className="peer h-full w-full outline-none text-base text-white pr-4 bg-transparent placeholder-gray-500"
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
                            className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-105"
                        >
                            <Plus size={22} />
                            <span className="truncate">New Project</span>
                        </Button>
                    </div>
                </header>

                {/* Recent Projects Section */}
                <section>
                    <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.015em] pb-6 pt-2 flex items-center gap-3">
                        <span className="w-2 h-8 bg-primary rounded-full"></span>
                        Recent Projects
                    </h2>
                    {loading ? (
                        <div className="text-gray-500 animate-pulse">Loading projects...</div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 bg-[#0F0F12] backdrop-blur-sm rounded-3xl border border-dashed border-gray-800">
                            <p className="text-xl font-medium">No projects found.</p>
                            <Button variant="link" onClick={() => handleTemplateSelect(null)} className="text-primary mt-2">
                                Create your first project
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-8">
                            {filteredProjects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Start New Toon Section */}
                <section className="mt-16">
                    <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.015em] pb-6 flex items-center gap-3">
                        <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                        Start a New Toon
                    </h2>
                    <TemplateList onSelect={handleTemplateSelect} />
                </section>


            </div>
        </DashboardLayout>
    );
}
