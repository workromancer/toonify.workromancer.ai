# 🤖 Backend AI Service 리팩토링 계획

> **우선순위**: 🔴 Critical  
> **예상 소요**: 3-5일  
> **Phase**: 1

## 📋 현재 상태 분석

### 파일 정보

- **경로**: `backend/app/services/ai.py`
- **라인 수**: 1,287줄
- **함수 개수**: 26개
- **클래스**: 1개 (AIService)

### 현재 구조

```python
class AIService:
    # 초기화 (15-56)
    __init__()
    _clean_json_text()

    # 스타일 관련 (68-174)
    recommend_style()
    augment_style_description()

    # 세계관 (177-235)
    augment_worldview()

    # 캐릭터 (239-368)
    augment_character_text()
    generate_character_sheet()
    get_character_suggestion()
    generate_character_batch_suggestions()
    analyze_character_concept()

    # 에피소드/컷 (370-920)
    generate_direction_options()
    generate_episode_ideas()
    generate_initial_cuts()

    # 이미지 생성 (416-657)
    generate_image()
    modify_image()
    _download_image()
    _download_image_as_pil()
    _prepare_multimodal_inputs()
    generate_project_cover_image()

    # 패널 이미지 (1146-1284)
    generate_panel_image()

    # 기타
    get_embedding()
    generate_project_cover_async()
    generate_character_sheet_async()
```

### 핵심 문제점

1. **단일 책임 원칙 위반**: 캐릭터, 에피소드, 스타일, 이미지 등 모든 AI 관련 로직이 한 클래스에
2. **테스트 어려움**: 개별 도메인 테스트를 위해 전체 서비스 모킹 필요
3. **Merge Conflict 빈도 높음**: 여러 기능 개발 시 동일 파일 수정
4. **코드 탐색 어려움**: 1,287줄에서 필요한 메서드 찾기 어려움

---

## 🎯 목표 구조

> ⚠️ **확장 구조**: Multi-Provider 이미지 생성을 위해 `08-multi-provider-image-generation.md` 참조

```
backend/app/services/ai/
├── __init__.py                    # AIService facade (통합 진입점)
├── base.py                        # 공통 클라이언트 + 유틸리티
├── config.py                      # AI 서비스 설정
│
├── providers/                     # 🆕 이미지 생성 Provider들
│   ├── __init__.py
│   ├── base_provider.py           # Abstract Provider 인터페이스
│   ├── gemini_provider.py         # Google Gemini Imagen
│   ├── openai_provider.py         # OpenAI DALL-E
│   ├── stability_provider.py      # Stable Diffusion
│   └── factory.py                 # Provider Factory
│
├── generation/                    # 🆕 이미지 생성 서비스 (고수준)
│   ├── image_service.py           # 통합 이미지 생성 서비스
│   ├── panel_service.py           # 패널 이미지 특화
│   ├── character_sheet_service.py # 캐릭터 시트 특화
│   └── cover_service.py           # 커버 이미지 특화
│
└── text/                          # 텍스트 생성 서비스
    ├── character.py               # 캐릭터 관련 AI 기능
    ├── episode.py                 # 에피소드/컷 생성
    ├── style.py                   # 스타일 추천/확장
    └── worldview.py               # 세계관 확장
```

---

## 📝 상세 실행 계획

### Step 1: 디렉토리 구조 생성 (Day 1)

```bash
mkdir -p backend/app/services/ai
touch backend/app/services/ai/__init__.py
touch backend/app/services/ai/base.py
touch backend/app/services/ai/{character,episode,panel,style,worldview,image}.py
```

### Step 2: base.py 작성 (Day 1)

**포함 내용:**

- GenAI 클라이언트 초기화 (싱글톤)
- 공통 유틸리티 함수들:
  - `_clean_json_text()`
  - `_download_image()`
  - `_download_image_as_pil()`
  - `_prepare_multimodal_inputs()`

````python
# backend/app/services/ai/base.py
from google import genai
from google.genai import types
from app.core.config import settings
from PIL import Image
import io
import requests
import re
from typing import List, Optional

class BaseAIService:
    """AI 서비스의 기본 클래스 - 클라이언트 및 공통 유틸리티 제공"""

    _client = None  # 싱글톤 클라이언트

    def __init__(self):
        if BaseAIService._client is None:
            api_key = settings.GEMINI_API_KEY
            if api_key:
                BaseAIService._client = genai.Client(api_key=api_key)
            else:
                # Vertex AI 설정
                BaseAIService._client = genai.Client(
                    vertexai=True,
                    project=settings.GCP_PROJECT,
                    location=settings.GCP_REGION
                )
        self.client = BaseAIService._client

    def _clean_json_text(self, text: str) -> str:
        """JSON 문자열에서 마크다운 코드 블록 제거"""
        text = re.sub(r'^```json\s*', '', text.strip())
        text = re.sub(r'\s*```$', '', text)
        return text.strip()

    def _download_image(self, url: str) -> bytes:
        """이미지 URL에서 바이트로 다운로드"""
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content

    def _download_image_as_pil(self, url: str) -> Image.Image:
        """이미지 URL에서 PIL Image로 다운로드"""
        img_bytes = self._download_image(url)
        return Image.open(io.BytesIO(img_bytes))
````

### Step 3: 도메인별 서비스 분할 (Day 2-3)

#### 3.1 character.py

```python
# backend/app/services/ai/character.py
from .base import BaseAIService
from typing import List

class CharacterAIService(BaseAIService):
    """캐릭터 관련 AI 기능"""

    def augment_character_text(self, name: str, tags: List[str], ...):
        """캐릭터 텍스트 확장"""
        ...

    def generate_character_sheet(self, name: str, description: str, ...):
        """캐릭터 시트 생성"""
        ...

    def get_character_suggestion(self, suggestion_type: str, ...):
        """캐릭터 속성 제안"""
        ...

    def generate_character_batch_suggestions(self, project_context: str, ...):
        """배치 캐릭터 제안 생성"""
        ...

    def analyze_character_concept(self, project_context: str, ...):
        """캐릭터 컨셉 분석 (역할/배경 제안)"""
        ...
```

#### 3.2 episode.py

```python
# backend/app/services/ai/episode.py
from .base import BaseAIService

class EpisodeAIService(BaseAIService):
    """에피소드/컷 관련 AI 기능"""

    def generate_direction_options(self, script: str, ...):
        """연출 옵션 생성"""
        ...

    def generate_episode_ideas(self, project_title: str, ...):
        """에피소드 아이디어 생성"""
        ...

    def generate_initial_cuts(self, episode_title: str, ...):
        """초기 컷 생성"""
        ...
```

#### 3.3 style.py

```python
# backend/app/services/ai/style.py
from .base import BaseAIService

class StyleAIService(BaseAIService):
    """스타일 관련 AI 기능"""

    def recommend_style(self, description: str, language: str = "en"):
        """스타일 추천"""
        ...

    def augment_style_description(self, current_prompt: str, ...):
        """스타일 설명 확장"""
        ...
```

#### 3.4 worldview.py

```python
# backend/app/services/ai/worldview.py
from .base import BaseAIService

class WorldviewAIService(BaseAIService):
    """세계관 관련 AI 기능"""

    def augment_worldview(self, description: str, ...):
        """세계관 확장"""
        ...
```

#### 3.5 panel.py

```python
# backend/app/services/ai/panel.py
from .base import BaseAIService

class PanelAIService(BaseAIService):
    """패널 이미지 생성 AI 기능"""

    def generate_panel_image(self, prompt: str, style_ref_url: str = None, ...):
        """웹툰 패널 이미지 생성"""
        ...
```

#### 3.6 image.py

```python
# backend/app/services/ai/image.py
from .base import BaseAIService

class ImageAIService(BaseAIService):
    """범용 이미지 생성/수정 AI 기능"""

    def generate_image(self, prompt: str, ...):
        """범용 이미지 생성"""
        ...

    def modify_image(self, original_image_url: str, instruction: str, ...):
        """이미지 수정"""
        ...

    def generate_project_cover_image(self, title: str, ...):
        """프로젝트 커버 이미지 생성"""
        ...

    def get_embedding(self, text: str):
        """텍스트 임베딩 생성"""
        ...
```

### Step 4: Facade 패턴으로 통합 (Day 3)

```python
# backend/app/services/ai/__init__.py
from .character import CharacterAIService
from .episode import EpisodeAIService
from .style import StyleAIService
from .worldview import WorldviewAIService
from .panel import PanelAIService
from .image import ImageAIService

class AIService:
    """
    AI 서비스 통합 Facade

    기존 코드와의 역호환성을 유지하면서 내부적으로
    도메인별 서비스에 위임합니다.
    """

    def __init__(self):
        self._character = CharacterAIService()
        self._episode = EpisodeAIService()
        self._style = StyleAIService()
        self._worldview = WorldviewAIService()
        self._panel = PanelAIService()
        self._image = ImageAIService()

    # === Character 위임 ===
    def augment_character_text(self, *args, **kwargs):
        return self._character.augment_character_text(*args, **kwargs)

    def generate_character_sheet(self, *args, **kwargs):
        return self._character.generate_character_sheet(*args, **kwargs)

    # ... (모든 메서드에 대해 위임)

    # === Episode 위임 ===
    def generate_episode_ideas(self, *args, **kwargs):
        return self._episode.generate_episode_ideas(*args, **kwargs)

    # ...

# 싱글톤 인스턴스 (기존 코드 호환)
ai_service = AIService()
```

### Step 5: 기존 파일 백업 및 교체 (Day 4)

```bash
# 백업
mv backend/app/services/ai.py backend/app/services/ai.py.backup

# 검증
python -c "from app.services.ai import ai_service; print('OK')"
```

### Step 6: 테스트 및 검증 (Day 4-5)

1. **Unit Test 작성**

   ```python
   # tests/services/ai/test_character.py
   def test_character_suggestion():
       ...
   ```

2. **통합 테스트**

   - 캐릭터 생성 플로우
   - 에피소드 생성 플로우
   - 커버 이미지 생성 플로우

3. **E2E 확인**
   - 로컬 환경에서 전체 워크플로우 테스트

---

## ✅ 체크리스트

- [x] 디렉토리 구조 생성
- [x] `base.py` 작성 및 테스트
- [x] `text/character.py` 분리 및 테스트
- [x] `text/episode.py` 분리 및 테스트
- [x] `text/style.py` 분리 및 테스트
- [x] `text/worldview.py` 분리 및 테스트
- [x] `generation/panel_service.py` 분리 및 테스트
- [x] `generation/image_service.py` 분리 및 테스트
- [x] `__init__.py` Facade 완성
- [x] 기존 ai.py 백업 및 교체
- [x] 전체 테스트 통과
- [ ] 프로덕션 배포 전 스테이징 검증

---

## 📊 예상 결과

| 지표                | Before | After |
| ------------------- | ------ | ----- |
| 파일 수             | 1      | 8     |
| 최대 파일 라인 수   | 1,287  | ~250  |
| 테스트 격리         | 불가능 | 가능  |
| Merge Conflict Risk | 높음   | 낮음  |

## ⚠️ 위험 요소 및 대응

| 위험                           | 확률 | 대응책                    |
| ------------------------------ | ---- | ------------------------- |
| Import 경로 변경으로 인한 오류 | 중   | Facade로 기존 import 유지 |
| 싱글톤 클라이언트 동시성 이슈  | 낮   | Thread-safe 패턴 적용     |
| 테스트 누락으로 인한 회귀      | 중   | E2E 테스트 우선 실행      |
