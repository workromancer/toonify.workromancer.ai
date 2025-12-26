# 🎬 Frontend StoryboardView 분할 계획

> **우선순위**: 🟠 High  
> **예상 소요**: 2-3일  
> **Phase**: 4

## 📋 현재 상태

### 파일 정보

- **경로**: `frontend/src/components/editor/StoryboardView.tsx`
- **라인 수**: 791줄
- **함수 개수**: 13개

### 현재 구조

```
StoryboardView
├── State: cuts, selectedCut, isGenerating, isBatchGenerating, ...
├── Navigation:
│   └── navigateToCut()          # 이전/다음 컷 이동
├── Generation:
│   ├── handleGenerateAll()      # 전체 이미지 생성
│   ├── handleGenerateImage()    # 단일 이미지 생성
│   └── generate_cut_task polling
├── Data:
│   └── fetchCuts()              # 컷 데이터 조회
├── Director:
│   ├── handleDirectorSuggest()  # 연출 제안
│   └── handleOptionSelect()     # 옵션 선택
├── Export:
│   └── handleExport()           # ZIP/웹툰 내보내기
└── UI: 컷 그리드, 선택 상태, 로딩 인디케이터
```

### 핵심 문제점

- 생성, 내비게이션, 데이터 조회 로직 혼재
- 상태 관리가 컴포넌트 내부에 집중
- 재사용 가능한 로직이 없음

---

## 🎯 목표 구조

```
frontend/src/components/editor/
├── StoryboardView/
│   ├── index.tsx              # 메인 오케스트레이터 (~200줄)
│   ├── CutGrid.tsx            # 컷 그리드 레이아웃 (~150줄)
│   ├── CutCard.tsx            # 개별 컷 카드 (~100줄)
│   ├── StoryboardToolbar.tsx  # 상단 툴바 (~100줄)
│   └── hooks/
│       ├── useStoryboard.ts   # 메인 상태 관리
│       ├── useCutGeneration.ts # 이미지 생성 로직
│       └── useExport.ts       # 내보내기 로직
```

---

## 📝 실행 계획

### Step 1: 커스텀 훅 추출 (Day 1)

#### useStoryboard.ts

```typescript
// hooks/useStoryboard.ts
export function useStoryboard(projectId: string, episodeId: string) {
  const [cuts, setCuts] = useState<StoryCut[]>([]);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCuts = useCallback(async () => {
    const response = await api.get(`/api/v1/episodes/${episodeId}/cuts`);
    setCuts(response.data);
  }, [episodeId]);

  const navigateToCut = useCallback(
    (direction: "prev" | "next") => {
      const currentIndex = cuts.findIndex((c) => c.id === selectedCutId);
      const newIndex =
        direction === "prev" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < cuts.length) {
        setSelectedCutId(cuts[newIndex].id);
      }
    },
    [cuts, selectedCutId]
  );

  useEffect(() => {
    fetchCuts();
  }, [fetchCuts]);

  return {
    cuts,
    selectedCutId,
    isLoading,
    setSelectedCutId,
    fetchCuts,
    navigateToCut,
  };
}
```

#### useCutGeneration.ts

```typescript
// hooks/useCutGeneration.ts
export function useCutGeneration(episodeId: string, onRefresh: () => void) {
  const [generatingCuts, setGeneratingCuts] = useState<Set<string>>(new Set());
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  const handleGenerateImage = useCallback(
    async (cutId: string) => {
      setGeneratingCuts((prev) => new Set(prev).add(cutId));
      try {
        await api.post(`/api/v1/episodes/${episodeId}/cuts/${cutId}/generate`);
        // 폴링 로직...
        await onRefresh();
        return true;
      } finally {
        setGeneratingCuts((prev) => {
          const next = new Set(prev);
          next.delete(cutId);
          return next;
        });
      }
    },
    [episodeId, onRefresh]
  );

  const handleGenerateAll = useCallback(
    async (cuts: StoryCut[]) => {
      setIsBatchGenerating(true);
      const pendingCuts = cuts.filter((c) => !c.image_path);
      for (const cut of pendingCuts) {
        await handleGenerateImage(cut.id);
      }
      setIsBatchGenerating(false);
    },
    [handleGenerateImage]
  );

  return {
    generatingCuts,
    isBatchGenerating,
    handleGenerateImage,
    handleGenerateAll,
  };
}
```

#### useExport.ts

```typescript
// hooks/useExport.ts
export function useExport(episodeId: string, projectId: string) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: "zip" | "webtoon") => {
      setIsExporting(true);
      try {
        const response = await api.get(
          `/api/v1/episodes/${episodeId}/export?format=${format}`,
          { responseType: "blob" }
        );
        // 다운로드 로직...
      } finally {
        setIsExporting(false);
      }
    },
    [episodeId]
  );

  return { isExporting, handleExport };
}
```

### Step 2: UI 컴포넌트 분리 (Day 2)

#### CutCard.tsx

```tsx
// CutCard.tsx
interface CutCardProps {
  cut: StoryCut;
  isSelected: boolean;
  isGenerating: boolean;
  onSelect: () => void;
  onGenerate: () => void;
  onDelete: () => void;
}

export function CutCard({
  cut,
  isSelected,
  isGenerating,
  ...props
}: CutCardProps) {
  return (
    <div className={cn("relative border rounded-lg", isSelected && "ring-2")}>
      {cut.image_path ? (
        <img src={cut.image_path} alt={`Cut ${cut.cut_order}`} />
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          {isGenerating ? <Loader className="animate-spin" /> : <ImageIcon />}
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <Button size="icon" onClick={props.onGenerate} disabled={isGenerating}>
          <Wand2 />
        </Button>
      </div>
    </div>
  );
}
```

#### StoryboardToolbar.tsx

```tsx
// StoryboardToolbar.tsx
interface StoryboardToolbarProps {
  onGenerateAll: () => void;
  onExport: (format: 'zip' | 'webtoon') => void;
  isBatchGenerating: boolean;
  isExporting: boolean;
}

export function StoryboardToolbar({ ... }: StoryboardToolbarProps) {
  return (
    <div className="flex justify-between items-center p-4 border-b">
      <h2>Storyboard</h2>
      <div className="flex gap-2">
        <Button onClick={onGenerateAll} disabled={isBatchGenerating}>
          {isBatchGenerating ? 'Generating...' : 'Generate All'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isExporting}>Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport('zip')}>ZIP</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('webtoon')}>Webtoon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

### Step 3: 메인 오케스트레이터 (Day 3)

```tsx
// index.tsx
export function StoryboardView({ projectId, episodeId }: Props) {
  const { cuts, selectedCutId, setSelectedCutId, fetchCuts } = useStoryboard(
    projectId,
    episodeId
  );
  const {
    generatingCuts,
    isBatchGenerating,
    handleGenerateImage,
    handleGenerateAll,
  } = useCutGeneration(episodeId, fetchCuts);
  const { isExporting, handleExport } = useExport(episodeId, projectId);

  return (
    <div className="flex flex-col h-full">
      <StoryboardToolbar
        onGenerateAll={() => handleGenerateAll(cuts)}
        onExport={handleExport}
        isBatchGenerating={isBatchGenerating}
        isExporting={isExporting}
      />

      <CutGrid>
        {cuts.map((cut) => (
          <CutCard
            key={cut.id}
            cut={cut}
            isSelected={cut.id === selectedCutId}
            isGenerating={generatingCuts.has(cut.id)}
            onSelect={() => setSelectedCutId(cut.id)}
            onGenerate={() => handleGenerateImage(cut.id)}
          />
        ))}
      </CutGrid>
    </div>
  );
}
```

---

## ✅ 체크리스트

- [ ] `StoryboardView/` 디렉토리 생성
- [ ] `useStoryboard.ts` 훅 추출
- [ ] `useCutGeneration.ts` 훅 추출
- [ ] `useExport.ts` 훅 추출
- [ ] `CutCard.tsx` 분리
- [ ] `CutGrid.tsx` 분리
- [ ] `StoryboardToolbar.tsx` 분리
- [ ] `index.tsx` 오케스트레이터 작성
- [ ] 테스트 및 검증

## 📊 예상 결과

| 지표              | Before | After               |
| ----------------- | ------ | ------------------- |
| 최대 파일 라인 수 | 791    | ~200                |
| 파일 수           | 1      | 7                   |
| 로직 재사용성     | 0%     | 훅 단위 재사용 가능 |
