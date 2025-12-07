'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/dashboard/ProjectCard';
import api from '@/lib/api';
import NewProjectModal from '@/components/dashboard/NewProjectModal';
import TemplateList from '@/components/dashboard/TemplateList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    style_preset: string;
    created_at: string;
    thumbnail_url?: string;
    // workspace_id...
}

export default function DashboardPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
    const [modalInitialValues, setModalInitialValues] = useState<{ style_preset?: string }>({});

    const fetchProjects = async () => {
        try {
            if (projects.length === 0) setLoading(true);
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

    return (
        <DashboardLayout>
            <div className="p-8">
                {/* Header with quick action */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold">My Projects</h2>
                    <Button
                        onClick={() => handleTemplateSelect(null)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                    >
                        <Plus className="mr-2" size={20} /> New Project
                    </Button>
                </div>

                {/* Templates Section */}
                <div className="mb-10">
                    <h3 className="text-lg font-semibold text-gray-400 mb-4">Start New</h3>
                    <TemplateList onSelect={handleTemplateSelect} />
                </div>

                {/* Projects Grid */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-4">Recent Projects</h3>
                    {loading ? (
                        <div className="text-gray-500">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                            <p className="text-xl mb-4">No projects yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    )}
                </div>

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
