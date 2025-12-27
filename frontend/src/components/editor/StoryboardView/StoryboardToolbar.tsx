'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Download, Clapperboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoryCut } from './types';

interface StoryboardToolbarProps {
  cuts: StoryCut[];
  isBatchGenerating: boolean;
  onGenerateAll: () => void;
  onExport: (format: 'zip' | 'webtoon') => void;
}

export function StoryboardToolbar({
  cuts,
  isBatchGenerating,
  onGenerateAll,
  onExport,
}: StoryboardToolbarProps) {
  const t = useTranslations('Project.Editor');

  return (
    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0f0f16] shrink-0 z-10">
      <h2 className="font-bold text-white flex items-center gap-2 text-sm">
        <Clapperboard size={16} className="text-purple-500" />
        {t('storyboardTitle')}
      </h2>
      <div className="flex gap-2">
        {cuts.some(c => !c.image_path) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateAll}
            disabled={isBatchGenerating}
            className="h-7 text-xs border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-300"
          >
            {isBatchGenerating ? <Loader2 className="animate-spin mr-1" size={12} /> : <Sparkles size={12} className="mr-1" />}
            {cuts.some(c => c.image_path) ? t('resumeGeneration') : t('generateAll')}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-white">
              <Download size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#13131c] border-slate-800 text-slate-200">
            <DropdownMenuItem onClick={() => onExport('zip')} className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
              <span>{t('exportZip')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('webtoon')} className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
              <span>{t('exportWebtoon')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
