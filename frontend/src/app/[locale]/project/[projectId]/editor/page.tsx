'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { Link } from '@/navigation';
import { useState, useEffect } from 'react';

import InspectorPanel from '@/components/editor/InspectorPanel';
import StoryboardView from '@/components/editor/StoryboardView';
import { useCanvasStore } from '@/store/useCanvasStore';
import api from '@/lib/api';
import { ArrowLeft, Save, Download, Cloud, Layers, Users, Image as ImageIcon, Settings, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export default function EditorPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params?.projectId as string;

    const [activeSegment, setActiveSegment] = useState('storyboard'); // script, storyboard (kept for reference if needed, though hidden)
    const { activeEpisodeId, setActiveEpisode, setReviewMode } = useCanvasStore();
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();
    const t = useTranslations('Project.Editor');

    const [projectTitle, setProjectTitle] = useState('');
    const [episodeTitle, setEpisodeTitle] = useState('');
    const [episodeOrder, setEpisodeOrder] = useState<number | null>(null);

    // Load episode from query param if present
    useEffect(() => {
        const epId = searchParams?.get('episode_id');
        if (epId) {
            setActiveEpisode(epId);
        }
    }, [searchParams, setActiveEpisode]);

    // Fetch Project Details
    useEffect(() => {
        if (!projectId) return;
        api.get(`/projects/${projectId}`).then(res => {
            setProjectTitle(res.data.title);
        }).catch(err => console.error("Failed to fetch project", err));
    }, [projectId]);

    // Fetch Episode Details
    useEffect(() => {
        if (!activeEpisodeId) {
            setEpisodeTitle('');
            setEpisodeOrder(null);
            return;
        }
        api.get(`/episodes/${activeEpisodeId}`).then(res => {
            setEpisodeTitle(res.data.title);
            setEpisodeOrder(res.data.episode_order);
        }).catch(err => console.error("Failed to fetch episode", err));
    }, [activeEpisodeId]);

    const handleExport = async () => {
        if (!activeEpisodeId) {
            toast({
                title: t('noEpisodeSelected'),
                description: t('selectEpisodeToExport'),
                variant: 'destructive',
            });
            return;
        }
        try {
            setExporting(true);
            const response = await api.post(`/episodes/${activeEpisodeId}/export`, { format: 'zip' }, {
                responseType: 'blob'
            });

            // Check if backend returned an error (JSON blob) instead of a file
            if (response.data.type === 'application/json') {
                const text = await response.data.text();
                const error = JSON.parse(text);
                throw new Error(error.detail || t('exportFailed'));
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${episodeTitle || 'export'}.zip`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            toast({
                title: t('exportStarted'),
                description: t('exportDownloading'),
            });

        } catch (err: any) {
            console.error("Export failed", err);
            toast({
                title: t('exportFailed'),
                description: err.message || t('exportFailedDesc'),
                variant: 'destructive'
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#05050a] text-slate-200 overflow-hidden font-sans selection:bg-purple-500/30">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0f0f16]">
                <div className="flex items-center gap-4">
                    <Link href={`/project/${projectId}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800/80 -ml-2">
                            <ArrowLeft size={18} className="mr-2" /> {t('back')}
                        </Button>
                    </Link>
                    <div className="h-4 w-[1px] bg-slate-800 mx-2"></div>

                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-200">{projectTitle}</span>
                        <span className="text-slate-600">/</span>
                        <span className="font-medium text-slate-300">{episodeTitle || t('title')}</span>
                        {episodeOrder !== null && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
                                #{episodeOrder}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewMode(true)}
                        className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                    >
                        <Smartphone size={16} className="mr-2" /> {t('review')}
                    </Button>

                    <Button
                        className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                        size="sm"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download size={16} className="mr-2" />
                        )}
                        {t('export')}
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden flex">
                {/* 2. Left Sidebar: Navigation (Fixed Icon Bar) */}
                <aside className="w-16 bg-[#0a0a10] border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-40">
                    <button className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-600/30 transition-colors">
                        <Layers size={20} />
                    </button>
                    <button className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <Users size={20} />
                    </button>
                    <button className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <ImageIcon size={20} />
                    </button>
                    <div className="flex-1" />
                    <button className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <Settings size={20} />
                    </button>
                </aside>

                <div className="flex-1 overflow-hidden">
                    <PanelGroup direction="horizontal">
                        {/* Center: Canvas / Editor */}
                        <Panel defaultSize={75} minSize={30}>
                            <div className="h-full flex flex-col bg-[#05050a]">
                                {/* Content Area - Only Storyboard */}
                                <div className="flex-1 overflow-hidden relative">
                                    <StoryboardView
                                        projectId={projectId?.toString() || ''}
                                    />
                                </div>
                            </div>
                        </Panel>

                        <PanelResizeHandle className="w-[1px] bg-slate-800 hover:bg-purple-500 transition-colors" />

                        {/* Right Sidebar: Inspector */}
                        <Panel defaultSize={25} minSize={15} maxSize={30} className="bg-[#0f0f16] border-l border-slate-800">
                            <InspectorPanel />
                        </Panel>
                    </PanelGroup>
                </div>
            </div>
        </div>
    );
}
