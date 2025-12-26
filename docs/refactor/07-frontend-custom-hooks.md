# 🪝 Frontend Custom Hooks 아키텍처 계획

> **우선순위**: 🟠 Medium  
> **예상 소요**: 지속적  
> **Phase**: 3-4 (병행)

## 📋 현재 상태

### hooks 디렉토리 현황

```
frontend/src/hooks/
└── use-toast.ts    # 유일한 커스텀 훅 (149 bytes)
```

### 문제점

- 비즈니스 로직이 컴포넌트 내부에 직접 작성됨
- API 호출 로직 중복
- 상태 관리 패턴 불일치
- 테스트 어려움

---

## 🎯 목표 구조

```
frontend/src/hooks/
├── use-toast.ts              # 기존 유지
│
├── api/                      # API 호출 관련 훅
│   ├── useProject.ts         # 프로젝트 CRUD
│   ├── useCharacter.ts       # 캐릭터 CRUD
│   ├── useEpisode.ts         # 에피소드 CRUD
│   └── useCut.ts             # 컷 CRUD
│
├── ai/                       # AI 기능 관련 훅
│   ├── useSuggestions.ts     # AI 제안 로직
│   ├── useImageGeneration.ts # 이미지 생성 로직
│   └── useAnalysis.ts        # 분석 로직
│
├── ui/                       # UI 상태 관련 훅
│   ├── useModal.ts           # 모달 상태 관리
│   ├── useKeyboard.ts        # 키보드 네비게이션
│   └── usePolling.ts         # 폴링 패턴
│
└── utils/                    # 유틸리티 훅
    ├── useDebounce.ts        # 디바운스
    └── useLocalStorage.ts    # 로컬 스토리지
```

---

## 📝 핵심 훅 상세 설계

### 1. useProject.ts

```typescript
// hooks/api/useProject.ts
import { useState, useCallback } from "react";
import api from "@/lib/api";

interface Project {
  id: string;
  title: string /* ... */;
}

export function useProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/projects/${id}`);
      setProject(response.data);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>) => {
      setIsLoading(true);
      try {
        const response = await api.patch(`/api/v1/projects/${id}`, data);
        setProject(response.data);
        return response.data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const generateCover = useCallback(async (id: string) => {
    await api.post(`/api/v1/projects/${id}/generate-cover`);
  }, []);

  // 초기 로드
  useEffect(() => {
    if (projectId) fetchProject(projectId);
  }, [projectId, fetchProject]);

  return {
    project,
    isLoading,
    error,
    fetchProject,
    updateProject,
    generateCover,
  };
}
```

### 2. useSuggestions.ts

```typescript
// hooks/ai/useSuggestions.ts
export function useSuggestions(projectId: string) {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "completed">(
    "idle"
  );

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setStatus("processing");
    try {
      await api.post(`/api/v1/projects/${projectId}/suggestions/generate`);
      // 폴링 시작
      pollForCompletion();
    } catch (err) {
      setStatus("idle");
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [projectId]);

  const pollForCompletion = useCallback(async () => {
    const interval = setInterval(async () => {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      if (response.data.suggestions_status === "completed") {
        clearInterval(interval);
        await fetchSuggestions();
        setStatus("completed");
      }
    }, 2000);
  }, [projectId]);

  const fetchSuggestions = useCallback(async () => {
    const response = await api.get(`/api/v1/projects/${projectId}/suggestions`);
    setSuggestions(response.data);
  }, [projectId]);

  return { suggestions, isGenerating, status, generate, fetchSuggestions };
}
```

### 3. usePolling.ts

```typescript
// hooks/utils/usePolling.ts
interface UsePollingOptions {
  interval?: number;
  maxAttempts?: number;
  onComplete?: () => void;
  onTimeout?: () => void;
}

export function usePolling<T>(
  checkFn: () => Promise<{ done: boolean; data?: T }>,
  options: UsePollingOptions = {}
) {
  const { interval = 2000, maxAttempts = 30, onComplete, onTimeout } = options;
  const [isPolling, setIsPolling] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const startPolling = useCallback(async () => {
    setIsPolling(true);
    let attempts = 0;

    const poll = async () => {
      attempts++;
      const result = await checkFn();

      if (result.done) {
        setData(result.data ?? null);
        setIsPolling(false);
        onComplete?.();
        return;
      }

      if (attempts >= maxAttempts) {
        setIsPolling(false);
        onTimeout?.();
        return;
      }

      setTimeout(poll, interval);
    };

    poll();
  }, [checkFn, interval, maxAttempts, onComplete, onTimeout]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return { isPolling, data, startPolling, stopPolling };
}
```

### 4. useImageGeneration.ts

```typescript
// hooks/ai/useImageGeneration.ts
export function useImageGeneration() {
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const isGenerating = useCallback(
    (id: string) => {
      return generatingIds.has(id);
    },
    [generatingIds]
  );

  const startGeneration = useCallback((id: string) => {
    setGeneratingIds((prev) => new Set(prev).add(id));
  }, []);

  const endGeneration = useCallback((id: string) => {
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const generate = useCallback(
    async (
      type: "character" | "cut" | "cover",
      id: string,
      options?: Record<string, any>
    ) => {
      startGeneration(id);
      try {
        const endpoints = {
          character: `/api/v1/characters/${id}/generate-image`,
          cut: `/api/v1/cuts/${id}/generate`,
          cover: `/api/v1/projects/${id}/generate-cover`,
        };
        await api.post(endpoints[type], options);
        return true;
      } finally {
        // 폴링 완료 후 endGeneration 호출
      }
    },
    [startGeneration]
  );

  return { isGenerating, generate, generatingIds };
}
```

---

## 📋 마이그레이션 가이드

### Before: 컴포넌트 내부 로직

```tsx
function ProjectHome({ projectId }) {
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/v1/projects/${projectId}`)
      .then((res) => setProject(res.data))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const handleUpdate = async (data) => {
    setIsLoading(true);
    const res = await api.patch(`/api/v1/projects/${projectId}`, data);
    setProject(res.data);
    setIsLoading(false);
  };

  // ... 더 많은 로직
}
```

### After: 커스텀 훅 사용

```tsx
function ProjectHome({ projectId }) {
  const { project, isLoading, updateProject } = useProject(projectId);
  const { suggestions, generate } = useSuggestions(projectId);

  // 컴포넌트는 UI에만 집중
}
```

---

## ✅ 우선순위별 구현 목록

### Phase 1 (즉시)

- [ ] `usePolling.ts` - 폴링 패턴 통합
- [ ] `useImageGeneration.ts` - 이미지 생성 통합

### Phase 2 (컴포넌트 리팩토링 시)

- [ ] `useProject.ts` - ProjectHome 리팩토링 시
- [ ] `useSuggestions.ts` - ProjectHome 리팩토링 시
- [ ] `useCharacterWizard.ts` - CharacterCastingWizard 리팩토링 시

### Phase 3 (추가 개선)

- [ ] `useDebounce.ts`
- [ ] `useKeyboard.ts`
- [ ] `useModal.ts`

## 📊 예상 결과

| 지표            | Before | After |
| --------------- | ------ | ----- |
| 커스텀 훅 수    | 1      | 12+   |
| 로직 재사용성   | 낮음   | 높음  |
| 컴포넌트 복잡도 | 높음   | 낮음  |
| 테스트 용이성   | 어려움 | 용이  |
