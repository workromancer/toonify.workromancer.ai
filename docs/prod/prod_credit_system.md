# **🪙 Toonify MVP 크레딧 차감 정책 (Credit Deduction Policy)**

## **1. 기본 원칙 (Policy Principles)**

현재는 Gemini 3 Pro Preview가 무료/저비용 구간이지만, 향후 유료 모델(Fal.ai, Paid Gemini) 전환을 대비하여 사용자에게 **"이 기능은 유료 가치가 있는 기능이다"**라는 인식을 심어주는 것이 목표입니다.

* **기본 단위:** **1 Credit (크레딧)**  
* **텍스트/분석 (Low Cost):** **1 ~ 5 Credits**  
* **이미지 생성 (High Cost):** **10 ~ 20 Credits**

## **2. 기능별 상세 차감표 (Detailed Table)**

### **🏗️ 1. 프로젝트 & 세계관 (Project & Worldview)**

| 기능 (Method) | 사용 모델 | 차감 크레딧 | 책정 사유 |
| :---- | :---- | :---- | :---- |
| **세계관 확장** augment_worldview | Gemini 3 Pro (Text) | **5** | 단순 생성이 아닌 3가지 옵션을 제안하는 고지능 작업임. |
| **프로젝트 커버 생성** generate_project_cover_image | **Gemini 3 Pro (Image)** | **15** | 프로젝트의 '얼굴'이 되는 고화질/시네마틱 이미지. 가장 높은 가치 부여. |

### **🎨 2. 화풍 (Art Style)**

| 기능 (Method) | 사용 모델 | 차감 크레딧 | 책정 사유 |
| :---- | :---- | :---- | :---- |
| **스타일 추천** recommend_style | Gemini 2.5 Flash | **1** | 텍스트 분석 및 추천은 빠르고 저렴함. |
| **스타일 샘플 생성** (Follow-up Image) | **Gemini 3 Pro (Image)** | **10** (장당) | 스타일 확인을 위한 이미지 생성이므로 일반 이미지와 동일하게 책정. |

### **👤 3. 캐릭터 (Characters)**

| 기능 (Method) | 사용 모델 | 차감 크레딧 | 책정 사유 |
| :---- | :---- | :---- | :---- |
| **캐릭터 확장/변형** augment_character_text | Gemini 3 Pro (Text) | **5** | 창의적인 페르소나/설정을 3가지로 제안하므로 가치가 높음. |
| **캐릭터 제안** (이름/태그) get_character_suggestion | Gemini 2.5 Flash | **1** | 간단한 브레인스토밍 도구. 부담 없이 쓰도록 저렴하게 설정. |
| **캐릭터 분석** (아키타입) analyze_character_concept | Gemini 2.5 Flash | **1** | 내부 분석 로직. |
| **캐릭터 시트 생성** ⭐ generate_character_sheet | **Gemini 3 Pro (Image)** | **20** | **[핵심 기능]** 전신/표정/포즈를 한 번에 생성하는 복잡한 작업. 가장 비쌈. |

### **🎬 4. 에피소드 & 스토리보드 (Episodes & Storyboard)**

| 기능 (Method) | 사용 모델 | 차감 크레딧 | 책정 사유 |
| :---- | :---- | :---- | :---- |
| **에피소드 아이디어** generate_episode_ideas | Gemini 2.5 Pro | **3** | 작가의 창작을 돕는 '조수' 역할. 적절한 가치 부여. |
| **초기 컷 기획** (콘티) generate_initial_cuts | Gemini 2.5 Pro | **5** | 컷 구성, 대사, 지문을 한 번에 짜주는 '감독' 역할. |
| **시각 연출 옵션** generate_direction_options | Gemini 2.5 Pro | **2** | 앵글/구도 제안. 콘티 수정 시 보조 도구. |
| **패널 이미지 (스마트)** ⭐ generate_panel_image | **Gemini 3 Pro (Image)** | **12** | **[주력 기능]** 레퍼런스(멀티모달)가 포함된 고난이도 생성. |
| **단순 컷 이미지** bg_generate_cut_image | **Gemini 3 Pro (Image)** | **8** | 컨텍스트가 적은 단순 배경/컷 생성. 스마트 생성보다 저렴하게 유도. |

### **🛠️ 5. 유틸리티 (Utilities)**

| 기능 (Method) | 사용 모델 | 차감 크레딧 | 책정 사유 |
| :---- | :---- | :---- | :---- |
| **일반 이미지 생성** generate_image | **Gemini 3 Pro (Image)** | **10** | 표준 이미지 생성 단가. |
| **이미지 수정** (Inpainting) modify_image | **Gemini 3 Pro (Image)** | **8** | 생성된 이미지를 고치는 작업. 실패 부담을 줄이기 위해 생성보다 약간 저렴하게. |

## **3. 초기 사용자 제공 전략 (MVP Launch Strategy)**

MVP 단계에서는 유저들이 기능을 충분히 경험하게 하면서도, "크레딧은 유한하다"는 인식을 주어야 합니다.

1. **웰컴 크레딧 (Welcome Bonus):**  
   * 신규 가입 시 **500 Credits** 무료 지급.  
   * *(시뮬레이션: 캐릭터 시트 5장(100) + 1화 분량 콘티 및 주요 컷 생성 가능)*  
2. **데일리 리필 (Daily Refill):**  
   * MVP 기간 동안 매일 **50 Credits** 무료 리필 (누적 불가).  
   * 유저가 매일 들어와서 Generate 버튼을 누르게 하는 리텐션 장치.  
3. **UI 표시 (UX):**  
   * 버튼 위에 차감될 크레딧을 명시하세요.  
   * 예: [ Generate Project Cover (-15 🪙) ]  
   * 무료 베타 기간이더라도 **"-15"가 깎이는 애니메이션**을 보여주어 가치를 체감시켜야 합니다.

## **4. 향후 유료화 전환 시 가치 환산**

*(나중에 Fal.ai 등을 도입하여 유료화할 때의 기준)*

* **10 Credits ≈ 30원 (이미지 1장)**  
* **500 Credits (웰컴팩) ≈ 1,500원 상당의 가치**