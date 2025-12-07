'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ProjectHeader from './ProjectHeader';
import ProjectSidebar from './ProjectSidebar';
import ProjectRightSidebar from './ProjectRightSidebar';
import CharacterCard, { Character } from './CharacterCard';
import AddCharacterCard from './AddCharacterCard';
import EditProjectModal from './modals/EditProjectModal';
import AddCharacterModal from './modals/AddCharacterModal';
import GenerateEpisodeModal from './modals/GenerateEpisodeModal';

interface Project {
    id: string;
    title: string;
    description?: string;
    style_preset: string;
    thumbnail_url?: string;
    subtitle?: string;
    genre?: string;
    worldview?: string;
}

interface ProjectHomeProps {
    project: Project;
    characters: Character[];
    episodes: any[];
    onProjectUpdate: (p: Project) => void;
    onCharacterAdd: (c: Character) => void;
    onEpisodeAdd: (e: any) => void;
}

export default function ProjectHome({ project, characters, episodes, onProjectUpdate, onCharacterAdd, onEpisodeAdd }: ProjectHomeProps) {
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [isAddCharacterOpen, setIsAddCharacterOpen] = useState(false);
    const [isGenerateEpisodeOpen, setIsGenerateEpisodeOpen] = useState(false);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden font-display">
            <div className="layout-container flex h-full grow flex-col">
                <ProjectHeader
                    projectId={project.id}
                    onSave={() => { }} // Placeholder or trigger generic save
                    onGenerateEpisode={() => setIsGenerateEpisodeOpen(true)}
                />
                <div className="flex flex-1">
                    <ProjectSidebar projectName={project.title} />
                    <main className="flex-1 px-4 py-8 md:px-8 lg:px-10 overflow-y-auto">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex flex-col gap-6">

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link href="/dashboard" className="text-gray-500 dark:text-[#a19db9] text-sm font-medium leading-normal hover:text-gray-900 dark:hover:text-white">All Projects</Link>
                                        <span className="text-gray-500 dark:text-[#a19db9] text-sm font-medium leading-normal">/</span>
                                        <span className="text-gray-900 dark:text-white text-sm font-medium leading-normal">{project.title}</span>
                                    </div>
                                    <div className="flex flex-wrap justify-between gap-3">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Project: {project.title}</p>
                                            {project.subtitle && <p className="text-xl text-gray-500">{project.subtitle}</p>}
                                            <p className="text-gray-600 dark:text-[#a19db9] text-base font-normal leading-normal">{project.worldview ? "Worldview defined." : "A central hub for managing project-level settings and character assets."}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-stretch justify-start rounded-lg bg-white dark:bg-[#1d1c27] shadow-sm @container border border-gray-200 dark:border-transparent">
                                    <div className="flex flex-col items-stretch justify-start @xl:flex-row @xl:items-start">
                                        <div
                                            className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-t-lg @xl:w-64 @xl:rounded-l-lg @xl:rounded-tr-none bg-gray-200 dark:bg-gray-800"
                                            style={{ backgroundImage: project.thumbnail_url ? `url("${project.thumbnail_url}")` : undefined }}
                                        >
                                            {!project.thumbnail_url && (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl font-bold opacity-30">
                                                    {project.title.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 p-4 @xl:px-4">
                                            <p className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Project Details</p>
                                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-gray-600 dark:text-[#a19db9] text-base font-normal leading-normal">Art Style: {project.style_preset}</p>
                                                    <p className="text-gray-600 dark:text-[#a19db9] text-base font-normal leading-normal">{project.description || project.worldview || "No description provided."}</p>
                                                </div>
                                                <Button
                                                    className="h-8 px-4 bg-primary text-white text-sm font-medium leading-normal hover:bg-primary/90"
                                                    onClick={() => setIsEditProjectOpen(true)}
                                                >
                                                    <span className="truncate">Edit Details</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">Characters</h2>
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                                        {characters.map(char => <CharacterCard key={char.id || char.name} character={char} />)}
                                        <div onClick={() => setIsAddCharacterOpen(true)}>
                                            <AddCharacterCard />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </main>
                    <ProjectRightSidebar projectId={project.id} episodes={episodes} />
                </div>
            </div>

            <EditProjectModal
                isOpen={isEditProjectOpen}
                onClose={() => setIsEditProjectOpen(false)}
                project={project}
                onUpdate={onProjectUpdate}
            />
            <AddCharacterModal
                isOpen={isAddCharacterOpen}
                onClose={() => setIsAddCharacterOpen(false)}
                projectId={project.id}
                onAdd={onCharacterAdd}
            />
            <GenerateEpisodeModal
                isOpen={isGenerateEpisodeOpen}
                onClose={() => setIsGenerateEpisodeOpen(false)}
                projectId={project.id}
                onGenerate={onEpisodeAdd}
                nextOrder={episodes ? episodes.length + 1 : 1}
            />
        </div>
    );
}
