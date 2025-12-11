# Unimplemented Requirements Checklist

Based on the analysis of `docs/new_requirments.md` and the current codebase, the following items are currently unimplemented or require further work.

## 1. Character Casting
- [x] **RAG Embedding Generation**:
    - [x] Update `Character` model to support embedding storage.
    - [x] Implement backend logic to generate embeddings (using `gemini-embedding-001`) when character attributes/settings are created or updated.
    - [x] Store embeddings for future RAG usage.

## 2. Episode Creation (Start)
- [x] **AI Episode Options Generation**:
    - [x] Implement Backend API `POST /episodes/generate-options` to call `ai_service.generate_episode_ideas`.
    - [x] Implement Frontend UI to request and display 3 episode options.
    - [x] Implement logic to select an option or allow user augmentation.
- [x] **AI Initial Cut Generation**:
    - [x] Implement Backend API `POST /episodes/generate-cuts` to call `ai_service.generate_initial_cuts` (Text-only first: Script, Dialogues, Panel Type).
    - [x] Implement Frontend UI to set cut count and trigger generation.
- [x] **Cut Image Generation**:
    - [x] Implement Backend API `POST /episodes/{id}/cuts/{cut_id}/generate-image` (or batch) to call `ai_service.generate_image` based on the review text.
    - [x] Implement Frontend UI to trigger image generation after text review.

## 3. Episode Review
- [x] **Review Process Mockup**:
    - [x] Implement the flow/mockup connecting the generated episode to the `MobileEpisodeViewer`.
    - [x] Ensure the viewer allows "reviewing" (approving/rejecting) cuts if required by the mockup scenario.

## 4. E2E Testing
- [x] **Test Documentation & Execution**:
    - [x] Create `docs/e2e_test_scenario.md` with the full test scenario.
    - [x] Copy the scenario file with today's date (e.g., `docs/e2e_test_2025-12-10.md`).
    - [x] Execute tests using the browser and mark progress in the dated file.

## 5. Projects (Verification)
- [x] **Cover Image List View**:
    - [x] Verify that the generic `ProjectCard` correctly updates/displays the generated cover image in the workspace list (requires `thumbnail_url` to be populated).
