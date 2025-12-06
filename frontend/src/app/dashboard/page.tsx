'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/dashboard/ProjectCard'; // Import fixed after previous run
import api from '@/lib/api';
import NewProjectModal from '@/components/dashboard/NewProjectModal'; // Added import

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

    const fetchProjects = async () => {
        try {
            setLoading(true); // Ensure loading state
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

    return (
        <DashboardLayout>
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold">My Projects</h2>
                    <NewProjectModal onProjectCreated={fetchProjects} />
                </div>

                {loading ? (
                    <div className="text-gray-500">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                        <p className="text-xl mb-4">No projects found.</p>
                        <NewProjectModal onProjectCreated={fetchProjects} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
