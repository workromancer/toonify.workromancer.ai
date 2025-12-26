# 🔧 Toonify Refactoring Master Plan

> **작성일**: 2025-12-26  
> **상태**: Planning Phase  
> **버전**: 1.0

## 📋 개요

이 디렉토리는 Toonify 프로젝트의 체계적인 리팩토링 계획을 담고 있습니다. 코드베이스 분석 결과를 바탕으로 우선순위별 개선 영역을 정의하고, 각 영역에 대한 상세 실행 계획을 제공합니다.

## 📊 현재 상태 요약

### 규모 분석

| 구분               | 파일                         | 라인 수 | 상태        |
| ------------------ | ---------------------------- | ------- | ----------- |
| Backend Service    | `ai.py`                      | 1,287   | 🔴 Critical |
| Backend Endpoint   | `episodes.py`                | 994     | 🔴 Critical |
| Frontend Component | `ProjectHome.tsx`            | 1,000   | 🔴 Critical |
| Frontend Component | `StoryboardView.tsx`         | 791     | 🟠 High     |
| Frontend Component | `CharacterCastingWizard.tsx` | 779     | 🟠 High     |
| Backend Endpoint   | `characters.py`              | 671     | 🟠 Medium   |
| Backend Endpoint   | `projects.py`                | 605     | 🟠 Medium   |

### 핵심 기술 부채

1. **단일 책임 원칙(SRP) 위반**: 대형 파일들이 여러 도메인의 로직을 포함
2. **스키마 분산**: Pydantic 스키마가 endpoint 파일에 인라인 정의
3. **UI/로직 결합**: 프론트엔드 컴포넌트들이 비즈니스 로직을 직접 포함
4. **커스텀 훅 부재**: 상태 관리 및 API 호출 로직의 재사용성 부족

## 📁 문서 구조

```
docs/refactor/
├── README.md                           # 이 파일 (마스터 계획)
├── 01-backend-ai-service.md            # AI 서비스 분할 계획
├── 02-backend-schemas.md               # Pydantic 스키마 중앙화 계획
├── 03-backend-endpoints.md             # Endpoint 슬림화 계획
├── 04-frontend-project-home.md         # ProjectHome 분할 계획
├── 05-frontend-character-wizard.md     # CharacterCastingWizard 분할 계획
├── 06-frontend-storyboard.md           # StoryboardView 분할 계획
├── 07-frontend-custom-hooks.md         # 커스텀 훅 아키텍처 계획
└── 08-multi-provider-image-generation.md  # 🆕 Multi-Provider 이미지 생성 아키텍처
```

## 🎯 우선순위 매트릭스

### Phase 1: Foundation (1-2주)

- [ ] `01-backend-ai-service.md` - AI 서비스 패키지화
- [ ] `02-backend-schemas.md` - 스키마 중앙화
- [ ] `08-multi-provider-image-generation.md` - 🆕 Multi-Provider 아키텍처

### Phase 2: Backend Cleanup (1주)

- [ ] `03-backend-endpoints.md` - Endpoint 슬림화

### Phase 3: Frontend Architecture (2-3주)

- [ ] `04-frontend-project-home.md` - ProjectHome 분할
- [ ] `05-frontend-character-wizard.md` - CharacterCastingWizard 분할
- [ ] `07-frontend-custom-hooks.md` - 커스텀 훅 도입

### Phase 4: Editor Optimization (1-2주)

- [ ] `06-frontend-storyboard.md` - StoryboardView 분할

## ⚠️ 리팩토링 원칙

1. **점진적 개선**: 한 번에 하나의 파일/기능만 수정
2. **테스트 우선**: 기존 동작을 보장하는 테스트 작성 후 리팩토링
3. **역호환성**: 기존 API/인터페이스 유지
4. **작은 PR**: 각 변경을 독립적으로 검토 가능한 크기로 분할

## 📈 예상 효과

| 지표                | 현재  | 목표  | 개선율 |
| ------------------- | ----- | ----- | ------ |
| 최대 파일 라인 수   | 1,287 | < 400 | 69% ⬇  |
| 스키마 중복 정의    | 22+   | 0     | 100% ⬇ |
| 커스텀 훅 수        | 1     | 8+    | 700% ⬆ |
| Merge Conflict Risk | High  | Low   | -      |

## 🔗 관련 문서

- [Backend Architecture Standards](/.gemini/antigravity/knowledge/backend_architecture_and_standards/)
- [Frontend Component Library](/.gemini/antigravity/knowledge/frontend_component_library_and_ui_standards/)
- [AI Service Architecture](/.gemini/antigravity/knowledge/ai_service_architecture_and_prompts/)
