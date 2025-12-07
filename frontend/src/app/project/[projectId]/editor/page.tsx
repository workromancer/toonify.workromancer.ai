'use client';

import { useParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Play, Save, Users, Clapperboard } from 'lucide-react';
import { useState } from 'react';
import EpisodeList from '@/components/editor/EpisodeList';
import CharacterList from '@/components/editor/CharacterList';

import CanvasArea from '@/components/editor/CanvasArea';
import InspectorPanel from '@/components/editor/InspectorPanel';
import StoryboardView from '@/components/editor/StoryboardView';

export default function EditorPage() {
    const { projectId } = useParams();
    const [activeSegment, setActiveSegment] = useState('storyboard'); // canvas, script, storyboard
    const [sidebarTab, setSidebarTab] = useState<'episodes' | 'characters'>('episodes');

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-gray-700 flex items-center justify-between px-4 bg-gray-800">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <ArrowLeft size={18} className="mr-2" /> Back
                        </Button>
                    </Link>
                    <h1 className="font-bold text-lg">Project Editor (ID: {projectId?.toString().slice(0, 8)}...)</h1>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">
                        <Save size={16} className="mr-2" /> Save
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" size="sm">
                        <Play size={16} className="mr-2" /> Export
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden">
                <PanelGroup direction="horizontal">
                    {/* Left Sidebar: Navigation / Assets */}
                    <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-gray-800 border-r border-gray-700 flex flex-col">
                        <div className="flex border-b border-gray-700">
                            <button
                                data-testid="tab-episodes"
                                className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors ${sidebarTab === 'episodes' ? 'text-purple-400 border-b-2 border-purple-500 bg-gray-700/50' : 'text-gray-400'}`}
                                onClick={() => setSidebarTab('episodes')}
                            >
                                <Clapperboard size={16} /> Episodes
                            </button>
                            <button
                                data-testid="tab-casting"
                                className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors ${sidebarTab === 'characters' ? 'text-purple-400 border-b-2 border-purple-500 bg-gray-700/50' : 'text-gray-400'}`}
                                onClick={() => setSidebarTab('characters')}
                            >
                                <Users size={16} /> Casting
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {sidebarTab === 'episodes' ? <EpisodeList /> : <CharacterList />}
                        </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-purple-500 transition-colors" />

                    {/* Center: Canvas / Editor */}
                    <Panel defaultSize={60} minSize={30}>
                        <div className="h-full flex flex-col">
                            {/* Toolbar */}
                            <div className="h-12 border-b border-gray-700 flex items-center px-4 gap-4 bg-gray-900/50">
                                <Button
                                    data-testid="view-storyboard-btn"
                                    variant={activeSegment === 'storyboard' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveSegment('storyboard')}
                                >
                                    Storyboard
                                </Button>
                                <Button
                                    data-testid="view-canvas-btn"
                                    variant={activeSegment === 'canvas' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveSegment('canvas')}
                                >
                                    Canvas
                                </Button>
                                <Button
                                    data-testid="view-script-btn"
                                    variant={activeSegment === 'script' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveSegment('script')}
                                >
                                    Script
                                </Button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-hidden relative">
                                {activeSegment === 'canvas' ? (
                                    <CanvasArea />
                                ) : activeSegment === 'storyboard' ? (
                                    <StoryboardView
                                        projectId={projectId?.toString() || ''}
                                        onEditCut={() => setActiveSegment('canvas')}
                                    />
                                ) : (
                                    <div className="w-full h-full max-w-3xl bg-gray-900 p-8 border border-gray-700 text-gray-300 font-mono text-sm mx-auto my-4 overflow-auto">
                                        <p>EXT. CITY STREET - DAY</p>
                                        <p className="mt-4">The HERO looks up at the sky...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-purple-500 transition-colors" />

                    {/* Right Sidebar: Inspector */}
                    <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-gray-800 border-l border-gray-700">
                        <InspectorPanel />
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
