# 🎨 Multi-Provider AI Image Generation 아키텍처

> **우선순위**: 🔴 Critical (01-backend-ai-service.md 확장)  
> **예상 소요**: 4-5일  
> **Phase**: 1

## 📋 개요

현재 Gemini Imagen API만 사용하고 있지만, 향후 다양한 AI 이미지 생성 서비스를 추가할 수 있도록 **Provider 패턴**을 도입합니다.

### 지원 예정 Provider

- **Gemini Imagen** (현재 사용 중)
- **OpenAI DALL-E 3**
- **Stability AI (Stable Diffusion)**
- **Midjourney** (API 출시 시)
- **Flux** (Black Forest Labs)
- **Leonardo AI**

---

## 🎯 목표 구조

```
backend/app/services/ai/
├── __init__.py                    # AIService facade
├── base.py                        # 공통 베이스 클래스
│
├── providers/                     # 이미지 생성 Provider들
│   ├── __init__.py
│   ├── base_provider.py           # Abstract Provider 인터페이스
│   ├── gemini_provider.py         # Google Gemini Imagen
│   ├── openai_provider.py         # OpenAI DALL-E
│   ├── stability_provider.py      # Stable Diffusion
│   ├── flux_provider.py           # Flux (Black Forest Labs)
│   └── factory.py                 # Provider Factory
│
├── generation/                    # 이미지 생성 서비스 (고수준)
│   ├── __init__.py
│   ├── image_service.py           # 통합 이미지 생성 서비스
│   ├── panel_service.py           # 패널 이미지 특화
│   ├── character_sheet_service.py # 캐릭터 시트 특화
│   └── cover_service.py           # 커버 이미지 특화
│
├── text/                          # 텍스트 생성 서비스 (기존)
│   ├── __init__.py
│   ├── character.py
│   ├── episode.py
│   ├── style.py
│   └── worldview.py
│
└── config.py                      # AI 서비스 설정
```

---

## 📝 상세 설계

### 1. Abstract Provider Interface

```python
# backend/app/services/ai/providers/base_provider.py
from abc import ABC, abstractmethod
from typing import Optional, List
from dataclasses import dataclass
from enum import Enum

class ImageStyle(Enum):
    """지원하는 이미지 스타일"""
    REALISTIC = "realistic"
    ANIME = "anime"
    CARTOON = "cartoon"
    ILLUSTRATION = "illustration"
    WEBTOON = "webtoon"

@dataclass
class ImageGenerationRequest:
    """통합 이미지 생성 요청"""
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    style: ImageStyle = ImageStyle.ILLUSTRATION
    seed: Optional[int] = None
    reference_images: Optional[List[bytes]] = None  # 이미지 참조
    num_images: int = 1
    guidance_scale: float = 7.5

@dataclass
class ImageGenerationResult:
    """통합 이미지 생성 결과"""
    images: List[bytes]
    provider: str
    model: str
    seed: Optional[int] = None
    cost_credits: float = 0.0
    metadata: dict = None

class BaseImageProvider(ABC):
    """Abstract Image Generation Provider"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider 이름 (예: 'gemini', 'openai', 'stability')"""
        pass

    @property
    @abstractmethod
    def supported_styles(self) -> List[ImageStyle]:
        """지원하는 스타일 목록"""
        pass

    @property
    @abstractmethod
    def max_resolution(self) -> tuple[int, int]:
        """최대 해상도 (width, height)"""
        pass

    @property
    @abstractmethod
    def supports_reference_images(self) -> bool:
        """참조 이미지 지원 여부"""
        pass

    @abstractmethod
    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """이미지 생성"""
        pass

    @abstractmethod
    async def edit(
        self,
        original_image: bytes,
        instruction: str,
        mask: Optional[bytes] = None
    ) -> ImageGenerationResult:
        """이미지 편집 (인페인팅)"""
        pass

    @abstractmethod
    def estimate_cost(self, request: ImageGenerationRequest) -> float:
        """예상 비용 (크레딧) 계산"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """API 상태 확인"""
        pass
```

### 2. Gemini Provider 구현

```python
# backend/app/services/ai/providers/gemini_provider.py
from google import genai
from google.genai import types
from .base_provider import (
    BaseImageProvider,
    ImageGenerationRequest,
    ImageGenerationResult,
    ImageStyle
)
from app.core.config import settings
import io
from PIL import Image

class GeminiImageProvider(BaseImageProvider):
    """Google Gemini Imagen Provider"""

    def __init__(self):
        self.client = genai.Client(
            vertexai=True,
            project=settings.GCP_PROJECT,
            location=settings.GCP_REGION
        )
        self.model = "gemini-2.0-flash-exp"  # 또는 imagen-3.0

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def supported_styles(self) -> List[ImageStyle]:
        return [
            ImageStyle.REALISTIC,
            ImageStyle.ANIME,
            ImageStyle.ILLUSTRATION,
            ImageStyle.WEBTOON
        ]

    @property
    def max_resolution(self) -> tuple[int, int]:
        return (1536, 1536)

    @property
    def supports_reference_images(self) -> bool:
        return True  # Gemini 2.0은 이미지 참조 지원

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        # 스타일별 프롬프트 조정
        styled_prompt = self._apply_style_prompt(request.prompt, request.style)

        # 참조 이미지 처리
        parts = [styled_prompt]
        if request.reference_images:
            for ref_img in request.reference_images:
                pil_img = Image.open(io.BytesIO(ref_img))
                parts.append(pil_img)

        # 생성 설정
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            temperature=0.8,
        )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=parts,
            config=config
        )

        # 결과 추출
        images = []
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                images.append(part.inline_data.data)

        return ImageGenerationResult(
            images=images,
            provider=self.name,
            model=self.model,
            cost_credits=self.estimate_cost(request),
            metadata={"parts_count": len(parts)}
        )

    async def edit(self, original_image: bytes, instruction: str, mask=None):
        pil_img = Image.open(io.BytesIO(original_image))
        parts = [instruction, pil_img]

        config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=parts,
            config=config
        )

        images = []
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                images.append(part.inline_data.data)

        return ImageGenerationResult(
            images=images,
            provider=self.name,
            model=self.model,
            cost_credits=15.0  # 편집 비용
        )

    def estimate_cost(self, request: ImageGenerationRequest) -> float:
        # 해상도별 비용
        pixels = request.width * request.height
        if pixels <= 512 * 512:
            return 5.0
        elif pixels <= 1024 * 1024:
            return 10.0
        else:
            return 15.0

    async def health_check(self) -> bool:
        try:
            # 간단한 텍스트 생성으로 연결 확인
            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents="Hello"
            )
            return True
        except Exception:
            return False

    def _apply_style_prompt(self, prompt: str, style: ImageStyle) -> str:
        """스타일에 맞는 프롬프트 조정"""
        style_prefixes = {
            ImageStyle.ANIME: "anime style, vibrant colors, clean lines, ",
            ImageStyle.WEBTOON: "korean webtoon style, high contrast, digital art, ",
            ImageStyle.ILLUSTRATION: "digital illustration, detailed, ",
            ImageStyle.REALISTIC: "photorealistic, high detail, ",
            ImageStyle.CARTOON: "cartoon style, bold outlines, "
        }
        return style_prefixes.get(style, "") + prompt
```

### 3. OpenAI DALL-E Provider

```python
# backend/app/services/ai/providers/openai_provider.py
from openai import AsyncOpenAI
from .base_provider import (
    BaseImageProvider,
    ImageGenerationRequest,
    ImageGenerationResult,
    ImageStyle
)
from app.core.config import settings
import base64

class OpenAIImageProvider(BaseImageProvider):
    """OpenAI DALL-E 3 Provider"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "dall-e-3"

    @property
    def name(self) -> str:
        return "openai"

    @property
    def supported_styles(self) -> List[ImageStyle]:
        return [
            ImageStyle.REALISTIC,
            ImageStyle.ILLUSTRATION,
            ImageStyle.CARTOON
        ]

    @property
    def max_resolution(self) -> tuple[int, int]:
        return (1792, 1024)  # DALL-E 3 최대

    @property
    def supports_reference_images(self) -> bool:
        return False  # DALL-E 3는 참조 이미지 미지원

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        # DALL-E 3 지원 사이즈로 변환
        size = self._normalize_size(request.width, request.height)

        # 스타일 적용
        styled_prompt = self._apply_style(request.prompt, request.style)

        response = await self.client.images.generate(
            model=self.model,
            prompt=styled_prompt,
            size=size,
            quality="hd",
            n=1,  # DALL-E 3는 1개만 지원
            response_format="b64_json"
        )

        images = [base64.b64decode(img.b64_json) for img in response.data]

        return ImageGenerationResult(
            images=images,
            provider=self.name,
            model=self.model,
            cost_credits=self.estimate_cost(request),
            metadata={"revised_prompt": response.data[0].revised_prompt}
        )

    async def edit(self, original_image: bytes, instruction: str, mask=None):
        # DALL-E 2의 edit API 사용 (DALL-E 3는 편집 미지원)
        response = await self.client.images.edit(
            model="dall-e-2",
            image=original_image,
            mask=mask,
            prompt=instruction,
            size="1024x1024",
            response_format="b64_json"
        )

        images = [base64.b64decode(img.b64_json) for img in response.data]

        return ImageGenerationResult(
            images=images,
            provider=self.name,
            model="dall-e-2",
            cost_credits=10.0
        )

    def estimate_cost(self, request: ImageGenerationRequest) -> float:
        # DALL-E 3 HD 가격 기준
        if request.width >= 1792 or request.height >= 1792:
            return 20.0
        else:
            return 15.0

    async def health_check(self) -> bool:
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False

    def _normalize_size(self, w: int, h: int) -> str:
        """DALL-E 3 지원 사이즈로 변환"""
        if w > h:
            return "1792x1024"
        elif h > w:
            return "1024x1792"
        else:
            return "1024x1024"

    def _apply_style(self, prompt: str, style: ImageStyle) -> str:
        style_map = {
            ImageStyle.REALISTIC: "photorealistic, high quality photo, ",
            ImageStyle.ILLUSTRATION: "digital illustration, detailed artwork, ",
            ImageStyle.CARTOON: "cartoon style, colorful, "
        }
        return style_map.get(style, "") + prompt
```

### 4. Stability AI Provider

```python
# backend/app/services/ai/providers/stability_provider.py
import httpx
from .base_provider import (
    BaseImageProvider,
    ImageGenerationRequest,
    ImageGenerationResult,
    ImageStyle
)
from app.core.config import settings

class StabilityImageProvider(BaseImageProvider):
    """Stability AI (Stable Diffusion) Provider"""

    def __init__(self):
        self.api_key = settings.STABILITY_API_KEY
        self.base_url = "https://api.stability.ai/v2beta"
        self.model = "stable-diffusion-xl-1024-v1-0"

    @property
    def name(self) -> str:
        return "stability"

    @property
    def supported_styles(self) -> List[ImageStyle]:
        return list(ImageStyle)  # 모든 스타일 지원

    @property
    def max_resolution(self) -> tuple[int, int]:
        return (1536, 1536)

    @property
    def supports_reference_images(self) -> bool:
        return True  # img2img 지원

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

        # 스타일 프리셋 매핑
        style_preset = self._get_style_preset(request.style)

        payload = {
            "text_prompts": [
                {"text": request.prompt, "weight": 1.0}
            ],
            "cfg_scale": request.guidance_scale,
            "width": request.width,
            "height": request.height,
            "samples": request.num_images,
            "steps": 30,
        }

        if request.negative_prompt:
            payload["text_prompts"].append({
                "text": request.negative_prompt,
                "weight": -1.0
            })

        if style_preset:
            payload["style_preset"] = style_preset

        if request.seed:
            payload["seed"] = request.seed

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/stable-image/generate/core",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()

        images = [
            base64.b64decode(artifact["base64"])
            for artifact in data["artifacts"]
        ]

        return ImageGenerationResult(
            images=images,
            provider=self.name,
            model=self.model,
            seed=data["artifacts"][0].get("seed"),
            cost_credits=self.estimate_cost(request)
        )

    def _get_style_preset(self, style: ImageStyle) -> str:
        """Stability AI 스타일 프리셋 매핑"""
        mapping = {
            ImageStyle.ANIME: "anime",
            ImageStyle.REALISTIC: "photographic",
            ImageStyle.ILLUSTRATION: "digital-art",
            ImageStyle.CARTOON: "comic-book",
        }
        return mapping.get(style)

    # ... edit, estimate_cost, health_check 구현
```

### 5. Provider Factory

```python
# backend/app/services/ai/providers/factory.py
from typing import Dict, Type, Optional
from .base_provider import BaseImageProvider, ImageStyle
from .gemini_provider import GeminiImageProvider
from .openai_provider import OpenAIImageProvider
from .stability_provider import StabilityImageProvider
from app.core.config import settings

class ProviderFactory:
    """이미지 생성 Provider Factory"""

    _providers: Dict[str, Type[BaseImageProvider]] = {
        "gemini": GeminiImageProvider,
        "openai": OpenAIImageProvider,
        "stability": StabilityImageProvider,
    }

    _instances: Dict[str, BaseImageProvider] = {}

    @classmethod
    def get_provider(cls, name: str) -> BaseImageProvider:
        """Provider 인스턴스 반환 (싱글톤)"""
        if name not in cls._instances:
            if name not in cls._providers:
                raise ValueError(f"Unknown provider: {name}")
            cls._instances[name] = cls._providers[name]()
        return cls._instances[name]

    @classmethod
    def get_default_provider(cls) -> BaseImageProvider:
        """기본 Provider 반환"""
        default = settings.DEFAULT_IMAGE_PROVIDER or "gemini"
        return cls.get_provider(default)

    @classmethod
    def get_provider_for_style(cls, style: ImageStyle) -> BaseImageProvider:
        """특정 스타일에 최적화된 Provider 반환"""
        style_preference = {
            ImageStyle.ANIME: ["gemini", "stability"],
            ImageStyle.WEBTOON: ["gemini"],
            ImageStyle.REALISTIC: ["stability", "openai"],
            ImageStyle.ILLUSTRATION: ["stability", "gemini"],
        }

        for provider_name in style_preference.get(style, ["gemini"]):
            try:
                provider = cls.get_provider(provider_name)
                if style in provider.supported_styles:
                    return provider
            except Exception:
                continue

        return cls.get_default_provider()

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[BaseImageProvider]):
        """새 Provider 등록 (플러그인 방식 확장)"""
        cls._providers[name] = provider_class

    @classmethod
    async def get_available_providers(cls) -> Dict[str, bool]:
        """사용 가능한 Provider 목록 및 상태"""
        results = {}
        for name in cls._providers:
            try:
                provider = cls.get_provider(name)
                results[name] = await provider.health_check()
            except Exception:
                results[name] = False
        return results
```

### 6. 통합 Image Generation Service

```python
# backend/app/services/ai/generation/image_service.py
from typing import Optional, List
from ..providers.factory import ProviderFactory
from ..providers.base_provider import (
    ImageGenerationRequest,
    ImageGenerationResult,
    ImageStyle
)
from app.services.billing import billing_service
from app.core.logging import get_logger

logger = get_logger(__name__)

class ImageGenerationService:
    """
    통합 이미지 생성 서비스

    Provider 추상화를 통해 다양한 AI 서비스로
    이미지를 생성할 수 있습니다.
    """

    def __init__(self, default_provider: str = None):
        self.default_provider = default_provider

    async def generate(
        self,
        prompt: str,
        user_id: str,
        width: int = 1024,
        height: int = 1024,
        style: ImageStyle = ImageStyle.ILLUSTRATION,
        provider_name: str = None,
        reference_images: List[bytes] = None,
        **kwargs
    ) -> ImageGenerationResult:
        """
        이미지 생성

        Args:
            prompt: 생성 프롬프트
            user_id: 사용자 ID (과금용)
            width, height: 이미지 크기
            style: 이미지 스타일
            provider_name: 사용할 Provider (None이면 자동 선택)
            reference_images: 참조 이미지들
        """
        # Provider 선택
        if provider_name:
            provider = ProviderFactory.get_provider(provider_name)
        else:
            provider = ProviderFactory.get_provider_for_style(style)

        # 요청 생성
        request = ImageGenerationRequest(
            prompt=prompt,
            width=width,
            height=height,
            style=style,
            reference_images=reference_images,
            **kwargs
        )

        # 비용 확인 및 선차감
        estimated_cost = provider.estimate_cost(request)
        await billing_service.check_and_reserve_credits(user_id, estimated_cost)

        try:
            # 이미지 생성
            logger.info(f"Generating image with {provider.name}", extra={
                "provider": provider.name,
                "style": style.value,
                "size": f"{width}x{height}"
            })

            result = await provider.generate(request)

            # 실제 비용 차감
            await billing_service.deduct_credits(
                user_id,
                result.cost_credits,
                action_type=f"image_generation_{provider.name}"
            )

            return result

        except Exception as e:
            # 실패 시 예약 크레딧 환불
            await billing_service.release_reserved_credits(user_id, estimated_cost)
            logger.error(f"Image generation failed: {e}")
            raise

    async def edit(
        self,
        original_image: bytes,
        instruction: str,
        user_id: str,
        provider_name: str = None,
        mask: bytes = None
    ) -> ImageGenerationResult:
        """이미지 편집"""
        provider = (
            ProviderFactory.get_provider(provider_name)
            if provider_name
            else ProviderFactory.get_default_provider()
        )

        # 비용 확인 및 차감 로직...
        result = await provider.edit(original_image, instruction, mask)
        return result

    async def get_providers_status(self) -> dict:
        """모든 Provider 상태 조회"""
        return await ProviderFactory.get_available_providers()


# 싱글톤 인스턴스
image_service = ImageGenerationService()
```

---

## ⚙️ 설정 확장

```python
# backend/app/core/config.py (추가)
class Settings(BaseSettings):
    # ... 기존 설정 ...

    # AI Image Providers
    DEFAULT_IMAGE_PROVIDER: str = "gemini"

    # Gemini (기존)
    GEMINI_API_KEY: Optional[str] = None
    GCP_PROJECT: Optional[str] = None
    GCP_REGION: str = "us-central1"

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None

    # Stability AI
    STABILITY_API_KEY: Optional[str] = None

    # Flux
    FLUX_API_KEY: Optional[str] = None

    # Provider별 활성화 여부
    ENABLE_GEMINI_PROVIDER: bool = True
    ENABLE_OPENAI_PROVIDER: bool = False
    ENABLE_STABILITY_PROVIDER: bool = False
```

---

## 📊 Provider 비교표

| Feature           | Gemini | DALL-E 3  | Stability |
| ----------------- | ------ | --------- | --------- |
| 참조 이미지       | ✅     | ❌        | ✅        |
| 인페인팅          | ✅     | ⚠️ (v2)   | ✅        |
| 애니메이션 스타일 | ✅     | ⚠️        | ✅        |
| 웹툰 스타일       | ✅     | ⚠️        | ⚠️        |
| 최대 해상도       | 1536²  | 1792×1024 | 1536²     |
| 비용 (상대)       | 💰     | 💰💰      | 💰        |
| 속도              | ⚡⚡   | ⚡⚡      | ⚡        |

---

## ✅ 체크리스트

- [ ] `providers/` 디렉토리 구조 생성
- [ ] `base_provider.py` 인터페이스 정의
- [ ] `gemini_provider.py` 구현 (기존 코드 마이그레이션)
- [ ] `openai_provider.py` 구현
- [ ] `stability_provider.py` 구현
- [ ] `factory.py` Provider Factory 구현
- [ ] `image_service.py` 통합 서비스 구현
- [ ] 설정 파일에 API 키 추가
- [ ] 기존 호출부 마이그레이션
- [ ] 각 Provider 테스트

## 📈 확장 포인트

새로운 Provider 추가 시:

1. `BaseImageProvider` 상속
2. `ProviderFactory._providers`에 등록
3. `.env`에 API 키 추가
4. 끝! 🎉
