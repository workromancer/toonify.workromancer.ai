# 🎨 Toonify AI 프롬프트 가이드

> AI 서비스 시스템 프롬프트 설정 및 개선 방안

## 📁 문서 구조

```
docs/ai-prompts/
├── README.md                    # 이 파일
├── 01-current-analysis.md       # 현재 프롬프트 분석
├── 02-system-prompts.md         # 권장 시스템 프롬프트
├── 03-implementation-guide.md   # 구현 가이드
└── 04-prompt-templates.md       # 프롬프트 템플릿
```

## 🎯 목적

1. **일관성 확보**: 모든 AI 기능에 표준화된 시스템 프롬프트 적용
2. **품질 향상**: 웹툰 업계 전문성이 반영된 프롬프트 설계
3. **유지보수성**: 중앙화된 프롬프트 관리로 쉬운 개선 및 A/B 테스트
4. **다국어 지원**: 한국어/영어 등 일관된 언어 지시 체계

## 📊 현재 AI 서비스 목록

| 서비스             | 파일 위치                     | 주요 기능                            |
| ------------------ | ----------------------------- | ------------------------------------ |
| CharacterAIService | `text/character.py`           | 캐릭터 컨셉, 배치 제안, 역할 분석    |
| EpisodeAIService   | `text/episode.py`             | 에피소드 아이디어, 컷 스크립트, 연출 |
| StyleAIService     | `text/style.py`               | 스타일 추천, 프롬프트 확장           |
| WorldviewAIService | `text/worldview.py`           | 세계관 확장 및 방향 제안             |
| PanelAIService     | `generation/panel_service.py` | 웹툰 패널 이미지 생성                |
| ImageAIService     | `generation/image_service.py` | 일반 이미지 생성                     |

## 🔗 관련 문서

- [AI 모델 설정](../AI_MODELS.md)
- [캐릭터 일관성 솔루션](../character-consistency-solution-ko.md)
- [개발자 가이드](../DEVELOPER_GUIDE.md)

---

_Last Updated: 2025-12-28_
