'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectRightSidebar from './ProjectRightSidebar';
import CharacterCard, { Character } from './CharacterCard';
import AddCharacterCard from './AddCharacterCard';
import EditProjectModal from './modals/EditProjectModal';
import AddCharacterModal from './modals/AddCharacterModal';
import GenerateEpisodeModal from './modals/GenerateEpisodeModal';
import { Save, Clapperboard, Edit2 } from 'lucide-react';

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
        <DashboardLayout>
            <div className="flex h-full items-start">
                <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0">
                    {/* Page Header matching Dashboard */}
                    <div className="flex flex-col gap-6 mb-8">
                        {/* Breadcrumb / Top Line */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                                    My Projects
                                </Link>
                                <span>/</span>
                                <span className="text-gray-900 dark:text-white font-medium">{project.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="h-9 px-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    <Save size={18} className="mr-2" />
                                    <span>Save</span>
                                </Button>
                                <Button
                                    className="h-10 px-4 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-sm shadow-sm transition-colors"
                                    onClick={() => setIsGenerateEpisodeOpen(true)}
                                >
                                    <Clapperboard size={18} className="mr-2" />
                                    <span>Generate Episode</span>
                                </Button>
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                                        {project.title}
                                    </h1>
                                    {project.subtitle && (
                                        <p className="text-xl text-gray-500 mt-1">{project.subtitle}</p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditProjectOpen(true)}
                                    className="gap-2"
                                >
                                    <Edit2 size={16} /> Edit Details
                                </Button>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal max-w-3xl">
                                {project.description || project.worldview || "No description provided."}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    Style: {project.style_preset}
                                </span>
                                {project.genre && (
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {project.genre}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="flex flex-col gap-8">
                        {/* Project Thumbnail / Overview */}
                        <div className="relative w-full aspect-[21/9] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                            {project.thumbnail_url ? (
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${project.thumbnail_url}")` }} />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                                    <span className="text-6xl font-black opacity-20">{project.title.charAt(0)}</span>
                                </div>
                            )}
                        </div>

                        {/* Characters Section */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-gray-900 dark:text-white text-2xl font-bold">Characters</h2>
                                {/* Add Character Button could also go here */}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                                <div onClick={() => setIsAddCharacterOpen(true)} className="cursor-pointer h-full">
                                    <AddCharacterCard />
                                </div>
                                {characters.map(char => (
                                    <CharacterCard key={char.id || char.name} character={char} />
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Sidebar - Sticky within the flex container */}
                <div className="hidden xl:block w-80 shrink-0 sticky top-0 h-[calc(100vh)] overflow-y-auto border-l border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-background-dark/50 p-4">
                    <ProjectRightSidebar projectId={project.id} episodes={episodes} />
                </div>
            </div>

            {/* Modals */}
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
        </DashboardLayout>
    );
}
