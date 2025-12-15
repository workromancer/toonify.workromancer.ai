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
import { ArrowLeft, Save, Download, Cloud, Layers, Users, Image as ImageIcon, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export default function EditorPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params?.projectId as string;
    const [activeSegment, setActiveSegment] = useState('storyboard'); // script, storyboard
    const { activeEpisodeId, setActiveEpisode } = useCanvasStore();
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();
    const t = useTranslations('Project.Editor');

    // Load episode from query param if present
    useEffect(() => {
        const epId = searchParams?.get('episode_id');
        if (epId) {
            setActiveEpisode(epId);
        }
    }, [searchParams, setActiveEpisode]);

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
            const response = await api.post(`/episodes/${activeEpisodeId}/export`, { format: 'webtoon' }, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'webtoon_export.png');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            toast({
                title: t('exportStarted'),
                description: t('exportDownloading'),
            });

        } catch (err) {
            console.error("Export failed", err);
            toast({
                title: t('exportFailed'),
                description: t('exportFailedDesc'),
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
                    <h1 className="font-bold text-sm text-slate-200">
                        {t('title')} <span className="text-slate-600 ml-2 font-mono text-xs">ID: {projectId?.toString().slice(0, 8)}...</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-4">
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-400">
                            <Cloud size={10} className="text-green-500" /> {t('saved')}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" className="bg-[#0f0f16] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600">
                        <Save size={16} className="mr-2" /> {t('save')}
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
                                {/* Toolbar */}
                                <div className="h-12 border-b border-slate-800 flex items-center px-4 gap-2 bg-[#05050a]">
                                    <Button
                                        data-testid="view-storyboard-btn"
                                        variant="ghost"
                                        size="sm"
                                        className={`text-xs font-medium ${activeSegment === 'storyboard' ? 'bg-purple-500/10 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                                        onClick={() => setActiveSegment('storyboard')}
                                    >
                                        {t('storyboard')}
                                    </Button>
                                    <Button
                                        data-testid="view-script-btn"
                                        variant="ghost"
                                        size="sm"
                                        className={`text-xs font-medium ${activeSegment === 'script' ? 'bg-purple-500/10 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                                        onClick={() => setActiveSegment('script')}
                                    >
                                        {t('script')}
                                    </Button>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 overflow-hidden relative">
                                    {activeSegment === 'storyboard' ? (
                                        <StoryboardView
                                            projectId={projectId?.toString() || ''}
                                        />
                                    ) : (
                                        <div className="w-full h-full max-w-3xl bg-[#0f0f16] p-12 border border-slate-800 text-slate-300 font-mono text-sm mx-auto my-8 overflow-auto shadow-2xl rounded-xl">
                                            <p className="text-slate-500 mb-6"># {t('scriptPlaceholderTitle')}</p>
                                            <p className="font-bold text-white mb-2">{t('scriptPlaceholderLine1')}</p>
                                            <p className="leading-relaxed">{t('scriptPlaceholderLine2')}</p>
                                        </div>
                                    )}
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
