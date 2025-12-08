# AI 기능 및 모델 명세서

본 문서는 Toonify 프로젝트에서 사용되는 AI 기능과 각 기능에 적용된 모델 정보를 정리한 것입니다.

| 기능 | 설명 | 사용 모델 | 함수명 |
| :--- | :--- | :--- | :--- |
| **화풍 추천** | 스토리 및 세계관 설명을 기반으로 적합한 3가지 화풍을 추천합니다. | `gemini-2.5-flash` | `recommend_style` |
| **세계관 구체화** | 사용자가 입력한 초기 세계관을 더 구체적이고 몰입감 있게 확장합니다. | `gemini-3-pro-preview` | `augment_worldview` |
| **컷 연출 제안** | 컷의 대사/지문을 분석하여 3가지 시각적 연출(구도, 앵글 등)을 제안합니다. | `gemini-3-pro-preview` | `generate_direction_options` |
| **이미지 생성** | 텍스트 프롬프트를 기반으로 웹툰 스타일의 이미지를 생성합니다. | `gemini-3-pro-image-preview` | `generate_image` |
| **이미지 수정** | 기존 이미지를 텍스트 지시사항에 따라 수정합니다. (멀티모달 기능 활용) | `gemini-3-pro-image-preview` | `modify_image` |
| **텍스트 임베딩** | 스크립트 유사도 검색(RAG)을 위해 텍스트를 벡터로 변환합니다. | `gemini-embedding-001` | `get_embedding` |
