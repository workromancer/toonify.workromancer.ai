# 🏠 Frontend ProjectHome 분할 계획

> **우선순위**: 🔴 Critical  
> **예상 소요**: 3-4일  
> **Phase**: 3

## 📋 현재 상태

### 파일 정보

- **경로**: `frontend/src/components/project/ProjectHome.tsx`
- **라인 수**: 1,000줄
- **함수 개수**: 23개

### 현재 구조 (주요 함수들)

```
ProjectHome
├── handleAiRecommend()         # AI 추천 요청
├── checkSuggestions()          # 제안 상태 폴링
├── handleUpdateProject()       # 프로젝트 업데이트
├── handleGenerateCover()       # 커버 생성
├── handleCharacterRetry()      # 캐릭터 재시도
├── handleCharacterClick()      # 캐릭터 클릭
├── handleSuggestionClick()     # 제안 클릭
├── handleCastNowClick()        # 캐스팅 클릭
├── handlePromoteConfirm()      # 승격 확인
├── handleStyleClick()          # 스타일 클릭
└── getHeroAction()             # Hero CTA 로직
```

### 핵심 문제점

- 1,000줄의 단일 컴포넌트
- UI 렌더링 + 비즈니스 로직 혼재
- 여러 섹션이 하나의 파일에 존재
- 상태 관리 복잡도 높음

---

## 🎯 목표 구조

```
frontend/src/components/project/
├── ProjectHome/
│   ├── index.tsx              # 메인 오케스트레이터 (~150줄)
│   ├── ProjectHero.tsx        # 히어로 섹션 (~200줄)
│   ├── CharacterSection.tsx   # 캐릭터 목록 (~200줄)
│   ├── SuggestionSection.tsx  # AI 제안 카드 (~150줄)
│   ├── EpisodeSection.tsx     # 에피소드 목록 (~150줄)
│   └── hooks/
│       ├── useProjectHome.ts  # 메인 상태 관리 훅
│       ├── useSuggestions.ts  # 제안 관련 로직
│       └── useCoverImage.ts   # 커버 이미지 로직
├── CharacterCard.tsx          # 기존 유지
├── SuggestionCard.tsx         # 기존 유지
└── modals/                    # 기존 유지
```

---

## 📝 실행 계획

### Step 1: 커스텀 훅 추출 (Day 1)

#### useProjectHome.ts

```typescript
// hooks/useProjectHome.ts
export function useProjectHome(project: Project) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const handleUpdateProject = async (updated: Project) => { ... };
  const refreshCharacters = async () => { ... };

  return {
    characters,
    suggestions,
    isPolling,
    handleUpdateProject,
    refreshCharacters,
  };
}
```

#### useSuggestions.ts

```typescript
// hooks/useSuggestions.ts
export function useSuggestions(projectId: string) {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiRecommend = async () => { ... };
  const checkSuggestions = async () => { ... };
  const handlePromoteConfirm = async (suggestion) => { ... };

  return { suggestions, isGenerating, handleAiRecommend, ... };
}
```

### Step 2: 섹션 컴포넌트 추출 (Day 2)

#### ProjectHero.tsx

```tsx
// ProjectHero.tsx
interface ProjectHeroProps {
  project: Project;
  onGenerateCover: () => void;
  onStyleClick: () => void;
  heroAction: HeroAction;
}

export function ProjectHero({
  project,
  onGenerateCover,
  ...props
}: ProjectHeroProps) {
  return (
    <div className="relative h-64 bg-gradient-...">
      {/* 커버 이미지 */}
      {/* 타이틀 */}
      {/* CTA 버튼 */}
    </div>
  );
}
```

#### CharacterSection.tsx

```tsx
// CharacterSection.tsx
interface CharacterSectionProps {
  characters: Character[];
  onCharacterClick: (char: Character) => void;
  onAddCharacter: () => void;
  onRetry: (charId: string) => void;
}

export function CharacterSection({ characters, ...props }: CharacterSectionProps) {
  return (
    <section>
      <SectionTitle title={t('characters')} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {characters.map(char => (
          <CharacterCard key={char.id} character={char} ... />
        ))}
        <AddCharacterCard onClick={onAddCharacter} />
      </div>
    </section>
  );
}
```

### Step 3: 메인 오케스트레이터 정리 (Day 3)

```tsx
// index.tsx
export function ProjectHome({ project, episodes, ...props }: ProjectHomeProps) {
  const { characters, suggestions, ... } = useProjectHome(project);
  const { handleAiRecommend, ... } = useSuggestions(project.id);
  const { handleGenerateCover } = useCoverImage(project.id);

  return (
    <div className="space-y-8">
      <ProjectHero
        project={project}
        onGenerateCover={handleGenerateCover}
        heroAction={getHeroAction()}
      />

      <SuggestionSection
        suggestions={suggestions}
        onRecommend={handleAiRecommend}
      />

      <CharacterSection
        characters={characters}
        onCharacterClick={handleCharacterClick}
      />

      <EpisodeSection episodes={episodes} />
    </div>
  );
}
```

### Step 4: 기존 파일 교체 (Day 4)

```bash
# 기존 파일 백업
mv ProjectHome.tsx ProjectHome.tsx.backup

# 새 디렉토리 구조로 교체
# ProjectHome/index.tsx가 default export
```

---

## ✅ 체크리스트

- [ ] `ProjectHome/` 디렉토리 생성
- [ ] `useProjectHome.ts` 훅 추출
- [ ] `useSuggestions.ts` 훅 추출
- [ ] `useCoverImage.ts` 훅 추출
- [ ] `ProjectHero.tsx` 컴포넌트 추출
- [ ] `CharacterSection.tsx` 컴포넌트 추출
- [ ] `SuggestionSection.tsx` 컴포넌트 추출
- [ ] `EpisodeSection.tsx` 컴포넌트 추출
- [ ] `index.tsx` 오케스트레이터 작성
- [ ] import 경로 업데이트
- [ ] 테스트 및 검증

## 📊 예상 결과

| 지표               | Before | After |
| ------------------ | ------ | ----- |
| 최대 파일 라인 수  | 1,000  | ~200  |
| 파일 수            | 1      | 8     |
| 테스트 가능 단위   | 1      | 8     |
| 렌더링 최적화 가능 | 어려움 | 용이  |
