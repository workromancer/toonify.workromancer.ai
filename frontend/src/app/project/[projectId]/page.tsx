'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ProjectHome from '@/components/project/ProjectHome';
import { Character } from '@/components/project/CharacterCard';

interface Project {
    id: string;
    title: string;
    description?: string;
    style_preset: string;
    thumbnail_url?: string;
}

export default function ProjectPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const [project, setProject] = useState<Project | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) return;

            try {
                // Fetch project details
                // Assuming GET /projects/{id} returns the project object
                const projectRes = await api.get(`/projects/${projectId}`);
                setProject(projectRes.data);

                // Fetch characters
                // Assuming GET /projects/{id}/characters or similar. 
                // If not, we might need to filter from a general endpoint or it's included in project details.
                // Let's assume a separate endpoint for now or empty if not implemented yet.
                // Based on previous conversations, there might be a /characters endpoint that takes project_id query param?
                // Or maybe the project response includes characters?
                // I'll try fetching from /characters/?project_id={projectId} if that works, or just mock for now if endpoint is unknown.
                 try {
                     const charactersRes = await api.get(`/characters/?project_id=${projectId}`);
                     setCharacters(charactersRes.data);
                 } catch (charErr) {
                     console.warn("Failed to fetch characters, or endpoint doesn't exist yet.", charErr);
                     // Fallback to empty list
                     setCharacters([]);
                 }

            } catch (err) {
                console.error("Failed to fetch project data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark text-gray-900 dark:text-white">
                Loading...
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark text-gray-900 dark:text-white">
                Project not found.
            </div>
        );
    }

    return <ProjectHome project={project} characters={characters} />;
}
