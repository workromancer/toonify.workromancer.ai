# 📋 AI 프롬프트 개선 실행 계획

> 01-draft 문서 및 02-draft-review 피드백을 종합한 구체적 구현 체크리스트

## 📊 개요

| 항목           | 상태                                           |
| -------------- | ---------------------------------------------- |
| 총 Phase       | 5                                              |
| 예상 소요 시간 | 3-5일                                          |
| 우선순위 기준  | 리뷰어 피드백 (Gemini 3 Pro + Claude Opus 4.5) |

---

## 🚨 Phase 1: Critical - 기반 인프라 구축 (Day 1)

### 1.1 프롬프트 모듈 디렉토리 생성

- [ ] `backend/app/services/ai/prompts/` 디렉토리 생성
- [ ] `__init__.py` - 중앙 export
- [ ] `base.py` - 공통 유틸리티

### 1.2 response_schema 패턴 표준화 (Critical Issue #1)

> 리뷰 피드백: 텍스트 기반 JSON 지시보다 **Pydantic 모델 + response_schema** 필수

- [ ] `backend/app/schemas/ai_responses/` 디렉토리 생성
- [ ] 캐릭터 응답 스키마 정의
  - [ ] `CharacterSuggestion` 모델
  - [ ] `CharacterBatchResponse` 모델
  - [ ] `CharacterAnalysisResponse` 모델
- [ ] 에피소드 응답 스키마 정의
  - [ ] `EpisodeIdea` 모델
  - [ ] `EpisodeCutsResponse` 모델
  - [ ] `DirectionOptionResponse` 모델
- [ ] 세계관 응답 스키마 정의
  - [ ] `WorldviewOption` 모델
  - [ ] `WorldviewAugmentResponse` 모델
- [ ] 스타일 응답 스키마 정의
  - [ ] `StyleRecommendation` 모델
  - [ ] `StyleAugmentResponse` 모델

### 1.3 Enum 동적 주입 패턴 (Critical Issue #3)

> 리뷰 피드백: 하드코딩된 `protagonist|antagonist|...` 제거

- [ ] `prompts/constants.py` 생성
- [ ] 기존 Enum 정의 위치 확인 및 통합
  - [ ] `CharacterRole` enum
  - [ ] `PanelType` enum
  - [ ] `PersonalityTag` enum
- [ ] `get_enum_validator_string()` 헬퍼 함수 구현
- [ ] 프롬프트 템플릿에서 `{valid_roles}` 변수 주입 패턴 적용

---

## ⚡ Phase 2: High Priority - 시스템 프롬프트 구현 (Day 2)

### 2.1 캐릭터 시스템 프롬프트

- [ ] `prompts/character.py` 생성
- [ ] `CHARACTER_SYSTEM_PROMPT` 상수 정의
- [ ] 적용 대상 함수:
  - [ ] `augment_character_text()` - 시스템 프롬프트 추가
  - [ ] `get_character_suggestion()` - 시스템 프롬프트 추가
  - [ ] `generate_character_batch_suggestions()` - 시스템 프롬프트 추가
  - [ ] `analyze_character_concept()` - 시스템 프롬프트 추가

### 2.2 에피소드 시스템 프롬프트

- [ ] `prompts/episode.py` 생성
- [ ] `EPISODE_SYSTEM_PROMPT` 상수 정의
- [ ] 적용 대상 함수:
  - [ ] `generate_direction_options()` - 시스템 프롬프트 추가
  - [ ] `generate_episode_ideas()` - 시스템 프롬프트 추가
  - [ ] `generate_prologue_ideas()` - 기존 프롬프트 업그레이드
  - [ ] `generate_initial_cuts()` - 시스템 프롬프트 추가

### 2.3 세계관 시스템 프롬프트

- [ ] `prompts/worldview.py` 생성
- [ ] `WORLDVIEW_SYSTEM_PROMPT` 상수 정의
- [ ] 적용 대상 함수:
  - [ ] `augment_worldview()` - 시스템 프롬프트 추가

### 2.4 스타일 시스템 프롬프트

- [ ] `prompts/style.py` 생성
- [ ] `STYLE_SYSTEM_PROMPT` 상수 정의
- [ ] 적용 대상 함수:
  - [ ] `recommend_style()` - 시스템 프롬프트 추가
  - [ ] `augment_style_description()` - 시스템 프롬프트 추가

### 2.5 패널 이미지 시스템 프롬프트 (개선)

- [ ] `prompts/image.py` 생성
- [ ] `PANEL_IMAGE_SYSTEM_PROMPT` 상수 개선
- [ ] **Multimodal Input Priority Rules** 섹션 추가 (Major Issue #4)
  - [ ] 이미지 우선순위: style ref vs character ref
  - [ ] 스타일 불일치 시 대응 전략
  - [ ] 저품질 참조 이미지 fallback

---

## 🧩 Phase 3: Logic Improvements - 장르 및 언어 처리 (Day 3)

### 3.1 장르 충돌 해결 전략 (Critical Issue #2)

- [ ] `prompts/genre.py` 생성
- [ ] `GENRE_MODIFIERS` 딕셔너리 정의
- [ ] **Primary/Secondary Genre 로직 구현**
  - [ ] `get_genre_modifier(genres: List[str], primary_idx: int = 0)` 함수
  - [ ] 충돌 해결 메타 프롬프트 추가
- [ ] 충돌 시나리오 문서화:
  - [ ] Romance + Thriller
  - [ ] Fantasy + Romance
  - [ ] Action + Comedy
  - [ ] 여러 장르 조합 시 테스트

### 3.2 언어 지시문 개선 (Minor Issue #6)

> 리뷰 피드백: 한국어 지시문이 피상적

- [ ] `prompts/language.py` 생성
- [ ] 개선된 `get_language_instruction()` 구현
- [ ] **한국 웹툰 특화 지시 추가:**
  - [ ] 말풍선 텍스트 길이 제한 (버블당 ~15자)
  - [ ] 존댓말('~요') vs 반말('~다') 선택 기준
  - [ ] 의성어/의태어 표현법 (쾅!, 두근두근 등)
  - [ ] 비속어/은어 수위 조절 가이드
  - [ ] 캐릭터 이름 짓기 규칙 (운율, 의미 암시, 발음)

---

## 🔧 Phase 4: Service Integration (Day 4)

### 4.1 CharacterAIService 수정

- [ ] `text/character.py` 수정
- [ ] 프롬프트 import 추가
- [ ] 각 함수에 `system_instruction` 파라미터 적용
- [ ] `response_schema` 적용
- [ ] 테스트: 캐릭터 배치 생성 API

### 4.2 EpisodeAIService 수정

- [ ] `text/episode.py` 수정
- [ ] 프롬프트 import 추가
- [ ] 각 함수에 `system_instruction` 파라미터 적용
- [ ] `response_schema` 적용
- [ ] 테스트: 에피소드 아이디어 생성 API

### 4.3 WorldviewAIService 수정

- [ ] `text/worldview.py` 수정
- [ ] 프롬프트 import 추가
- [ ] `system_instruction` 파라미터 적용
- [ ] `response_schema` 적용
- [ ] 테스트: 세계관 확장 API

### 4.4 StyleAIService 수정

- [ ] `text/style.py` 수정
- [ ] 프롬프트 import 추가
- [ ] `system_instruction` 파라미터 적용
- [ ] `response_schema` 적용
- [ ] 테스트: 스타일 추천 API

### 4.5 PanelAIService 수정

- [ ] `generation/panel_service.py` 수정
- [ ] 개선된 시스템 프롬프트 적용
- [ ] Multimodal priority rules 반영
- [ ] 테스트: 패널 이미지 생성

---

## 🧪 Phase 5: Quality Assurance & Documentation (Day 5)

### 5.1 에러 핸들링 개선 (Minor Issue #8)

- [ ] `print` → 구조화 로깅 전환
- [ ] 재시도 로직 추가 (`tenacity` 라이브러리 고려)
- [ ] AI 응답 파싱 실패 시 폴백 패턴 구현

### 5.2 테스트 작성

- [ ] 각 서비스별 유닛 테스트
- [ ] response_schema 검증 테스트
- [ ] 장르 복합 충돌 테스트
- [ ] 언어별 출력 품질 테스트

### 5.3 문서 업데이트

- [ ] `docs/ai-prompts/README.md` 업데이트
- [ ] 각 프롬프트별 **입력→출력 예시** 추가 (Issue #11)
- [ ] `prompts/` 디렉토리 구조 반영
- [ ] 마이그레이션 완료 표시

### 5.4 Deferred Items (연기)

> 리뷰 피드백: A/B 테스트 프레임워크는 오버엔지니어링

- [ ] A/B 테스트 프레임워크 → Phase 2 로드맵 이동
- [ ] 프롬프트 버전 관리 → 추후 검토

---

## 📝 체크리스트 진행 현황

### 현재 상태:

| Phase   | 상태           | 완료율 |
| ------- | -------------- | ------ |
| Phase 1 | ⬜ Not Started | 0%     |
| Phase 2 | ⬜ Not Started | 0%     |
| Phase 3 | ⬜ Not Started | 0%     |
| Phase 4 | ⬜ Not Started | 0%     |
| Phase 5 | ⬜ Not Started | 0%     |

### 기존 구현 상태 참고:

| 서비스  | 함수                        | 시스템 프롬프트 | 언어 지시      | response_schema |
| ------- | --------------------------- | --------------- | -------------- | --------------- |
| Episode | `generate_prologue_ideas()` | ✅ 있음         | ⬜ 표준화 필요 | ⬜ 미적용       |
| Panel   | `generate_panel_image()`    | ✅ 있음         | N/A            | N/A             |
| 나머지  | 전체                        | ⬜ 없음         | ⬜ 불일치      | ⬜ 미적용       |

---

## 🔗 관련 문서

- [01-current-analysis.md](../01-draft/01-current-analysis.md) - 현황 분석
- [02-system-prompts.md](../01-draft/02-system-prompts.md) - 권장 시스템 프롬프트
- [03-implementation-guide.md](../01-draft/03-implementation-guide.md) - 구현 가이드
- [04-prompt-templates.md](../01-draft/04-prompt-templates.md) - 프롬프트 템플릿
- [01-review-gemini-3-pro.md](../02-draft-review/01-review-gemini-3-pro.md) - 리뷰 #1
- [02-review-claude-opus-4-5.md](../02-draft-review/02-review-claude-opus-4-5.md) - 리뷰 #2

---

_Last Updated: 2025-12-28_
