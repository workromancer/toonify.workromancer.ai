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
    const projectId = params?.projectId as string;
    const [project, setProject] = useState<Project | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [episodes, setEpisodes] = useState<any[]>([]); // Define Episode type properly if possible
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) return;

            try {
                // Fetch project details
                const projectRes = await api.get(`/projects/${projectId}`);
                setProject(projectRes.data);

                // Fetch characters
                try {
                    const charactersRes = await api.get(`/characters/?project_id=${projectId}`);
                    setCharacters(charactersRes.data);
                } catch (charErr) {
                    console.warn("Failed to fetch characters", charErr);
                    setCharacters([]);
                }

                // Fetch episodes
                try {
                    const episodesRes = await api.get(`/episodes/?project_id=${projectId}`);
                    setEpisodes(episodesRes.data);
                } catch (epErr) {
                    console.warn("Failed to fetch episodes", epErr);
                    setEpisodes([]);
                }

            } catch (err) {
                console.error("Failed to fetch project data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    const handleProjectUpdate = (updatedProject: Project) => {
        setProject(updatedProject);
    };

    const handleCharacterAdd = (newCharacter: Character) => {
        setCharacters([...characters, newCharacter]);
    };

    const handleEpisodeAdd = (newEpisode: any) => {
        setEpisodes([...episodes, newEpisode]);
    };

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

    return (
        <ProjectHome
            project={project}
            characters={characters}
            episodes={episodes}
            onProjectUpdate={handleProjectUpdate}
            onCharacterAdd={handleCharacterAdd}
            onEpisodeAdd={handleEpisodeAdd}
        />
    );
}
