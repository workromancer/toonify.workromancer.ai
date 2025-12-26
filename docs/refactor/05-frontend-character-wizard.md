# 🧙 Frontend CharacterCastingWizard 분할 계획

> **우선순위**: 🟠 High  
> **예상 소요**: 2-3일  
> **Phase**: 3

## 📋 현재 상태

### 파일 정보

- **경로**: `frontend/src/components/project/CharacterCastingWizard.tsx`
- **라인 수**: 779줄
- **함수 개수**: 20개

### 현재 구조

```
CharacterCastingWizard
├── State: step, direction, characterData, suggestions, ...
├── Helpers:
│   ├── getStepNumber()
│   ├── handleNextStep()
│   ├── handlePrevStep()
├── Handlers:
│   ├── handleConceptSubmit()
│   ├── handleAddKeyword()
│   ├── handleStyleSubmit()
│   ├── handleSuggestion()
│   ├── analyze()
│   └── handleFinalize()
├── Animation:
│   ├── hidden()
│   └── exit()
└── Step Renders (내부 함수):
    ├── renderConceptStep()    # ~40줄
    ├── renderStyleStep()      # ~120줄
    ├── renderRoleStep()       # ~70줄
    └── renderOtherSteps()     # placeholder
```

### 핵심 문제점

- 모든 스텝 로직이 하나의 파일에 존재
- `renderXxxStep()` 패턴은 컴포넌트 분리의 anti-pattern
- 새 스텝 추가 시 전체 파일 수정 필요
- 각 스텝 독립 테스트 어려움

---

## 🎯 목표 구조

```
frontend/src/components/project/
├── CharacterCastingWizard/
│   ├── index.tsx                 # 메인 오케스트레이터 (~150줄)
│   ├── StepIndicator.tsx         # 스텝 인디케이터 (~50줄)
│   ├── steps/
│   │   ├── ConceptStep.tsx       # 컨셉 입력 스텝 (~100줄)
│   │   ├── StyleStep.tsx         # 스타일 선택 스텝 (~150줄)
│   │   └── RoleStep.tsx          # 역할/배경 스텝 (~100줄)
│   └── hooks/
│       └── useCharacterWizard.ts # 상태 + API 로직 (~200줄)
```

---

## 📝 실행 계획

### Step 1: 커스텀 훅 추출 (Day 1)

```typescript
// hooks/useCharacterWizard.ts
import { useState, useCallback } from "react";
import api from "@/lib/api";

type StepName = "concept" | "style" | "role";

interface CharacterData {
  name: string;
  age: string;
  visualKeywords: string[];
  personality: string;
  role: string;
  lore: string;
}

export function useCharacterWizard(projectId: string) {
  const [step, setStep] = useState<StepName>("concept");
  const [direction, setDirection] = useState(1);
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: "",
    age: "",
    visualKeywords: [],
    personality: "",
    role: "",
    lore: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({ name: [], visuals: [] });

  const handleNextStep = useCallback((next: StepName) => {
    setDirection(1);
    setStep(next);
  }, []);

  const handlePrevStep = useCallback((prev: StepName) => {
    setDirection(-1);
    setStep(prev);
  }, []);

  const handleSuggestion = useCallback(
    async (type: "name" | "visuals" | "lore") => {
      setIsLoading(true);
      try {
        const response = await api.post("/api/v1/characters/suggest", {
          project_id: projectId,
          type,
          ...characterData,
        });
        setSuggestions((prev) => ({ ...prev, [type]: response.data }));
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, characterData]
  );

  const analyze = useCallback(async () => {
    const response = await api.post("/api/v1/characters/analyze", {
      project_id: projectId,
      name: characterData.name,
      age: characterData.age,
      visual_keywords: characterData.visualKeywords,
      personality: characterData.personality,
    });
    setCharacterData((prev) => ({
      ...prev,
      role: response.data.role,
      lore: response.data.lore,
    }));
  }, [projectId, characterData]);

  const handleFinalize = useCallback(async () => {
    const response = await api.post("/api/v1/characters", {
      project_id: projectId,
      name: characterData.name,
      // ... 나머지 필드
    });
    return response.data;
  }, [projectId, characterData]);

  return {
    step,
    direction,
    characterData,
    suggestions,
    isLoading,
    setCharacterData,
    handleNextStep,
    handlePrevStep,
    handleSuggestion,
    analyze,
    handleFinalize,
  };
}
```

### Step 2: 스텝 컴포넌트 추출 (Day 2)

#### ConceptStep.tsx

```tsx
// steps/ConceptStep.tsx
interface ConceptStepProps {
  characterData: CharacterData;
  onChange: (data: Partial<CharacterData>) => void;
  onNext: () => void;
  suggestions: { name: string[] };
  onSuggest: (type: 'name') => void;
  isLoading: boolean;
}

export function ConceptStep({ characterData, onChange, onNext, ... }: ConceptStepProps) {
  const t = useTranslations('character');

  return (
    <motion.div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('nameLabel')}</Label>
        <Input
          value={characterData.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Button variant="ghost" onClick={() => onSuggest('name')}>
          <Wand2 className="h-4 w-4" /> {t('suggestName')}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{t('ageLabel')}</Label>
        <Input
          value={characterData.age}
          onChange={(e) => onChange({ age: e.target.value })}
        />
      </div>

      <Button onClick={onNext}>{t('next')}</Button>
    </motion.div>
  );
}
```

#### StyleStep.tsx

```tsx
// steps/StyleStep.tsx
interface StyleStepProps {
  characterData: CharacterData;
  onChange: (data: Partial<CharacterData>) => void;
  onNext: () => void;
  onBack: () => void;
  suggestions: { visuals: string[] };
  onSuggest: (type: 'visuals') => void;
}

export function StyleStep({ ... }: StyleStepProps) {
  // 비주얼 키워드 입력 UI
  // 성격 입력 UI
  return (...);
}
```

### Step 3: 메인 오케스트레이터 (Day 2-3)

```tsx
// index.tsx
import { useCharacterWizard } from './hooks/useCharacterWizard';
import { StepIndicator } from './StepIndicator';
import { ConceptStep } from './steps/ConceptStep';
import { StyleStep } from './steps/StyleStep';
import { RoleStep } from './steps/RoleStep';

export function CharacterCastingWizard({ projectId, projectTitle }: Props) {
  const {
    step, direction, characterData, suggestions, isLoading,
    setCharacterData, handleNextStep, handlePrevStep,
    handleSuggestion, analyze, handleFinalize
  } = useCharacterWizard(projectId);

  const renderStep = () => {
    switch (step) {
      case 'concept':
        return (
          <ConceptStep
            characterData={characterData}
            onChange={(d) => setCharacterData(prev => ({ ...prev, ...d }))}
            onNext={() => handleNextStep('style')}
            suggestions={suggestions}
            onSuggest={handleSuggestion}
            isLoading={isLoading}
          />
        );
      case 'style':
        return <StyleStep ... />;
      case 'role':
        return <RoleStep ... />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <StepIndicator currentStep={step} />
      <AnimatePresence mode="wait" custom={direction}>
        {renderStep()}
      </AnimatePresence>
    </div>
  );
}
```

---

## ✅ 체크리스트

- [ ] `CharacterCastingWizard/` 디렉토리 생성
- [ ] `useCharacterWizard.ts` 훅 추출
- [ ] `StepIndicator.tsx` 분리
- [ ] `ConceptStep.tsx` 분리
- [ ] `StyleStep.tsx` 분리
- [ ] `RoleStep.tsx` 분리
- [ ] `index.tsx` 오케스트레이터 작성
- [ ] 기존 파일 교체
- [ ] 테스트 및 검증

## 📊 예상 결과

| 지표                | Before | After |
| ------------------- | ------ | ----- |
| 최대 파일 라인 수   | 779    | ~200  |
| 파일 수             | 1      | 6     |
| 새 스텝 추가 용이성 | 어려움 | 단순  |
