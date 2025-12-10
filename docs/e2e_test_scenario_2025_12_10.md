# E2E Test Scenario (2025-12-10)

## 1. Project Setup & Cover Image
- [ ] **Data Setup**: Ensure a user exists and is logged in.
- [ ] **Navigate**: Go to the Workspace Dashboard.
- [ ] **Action**: Click "New Project" (or use existing).
- [ ] **Verify**: Project Home loads.
- [ ] **Action**: Click "Set Art Style" (or "Edit Style" if already set).
- [ ] **Action**: Select a style (e.g., 'Webtoon') and confirm.
- [ ] **Verify**: Toast/Notification appears: "Generating project cover image..."
- [ ] **Wait**: Wait for async generation to complete.
- [ ] **Verify**: Project Home header background updates with the new AI-generated image.
- [ ] **Navigate**: Go back to Workspace Dashboard.
- [ ] **Verify**: The project card in the list shows the new cover image.

## 2. Character Casting with AI
- [ ] **Navigate**: Go to Project Home.
- [ ] **Verify**: "Start Character Casting" nudge is visible.
- [ ] **Action**: Click "Start Character Casting".
- [ ] **Verify**: Casting Wizard opens.
- [ ] **Action**: Enter Character Name (e.g., "Luna").
- [ ] **Action**: Enter basic description (e.g., "Magic user").
- [ ] **Action**: Click "Augment with AI".
- [ ] **Verify**: Description field updates with richer text.
- [ ] **Action**: Click "Generate Character Sheet".
- [ ] **Verify**: Loading state: "Summoning Luna...".
- [ ] **Wait**: Wait for image generation.
- [ ] **Verify**: Generated image appears (Split view).
- [ ] **Action**: Save Character (Finish).
- [ ] **Verify**: Redirected to Project Home, Character "Luna" is listed.

## 3. Episode Creation & AI Assistance
- [ ] **Navigate**: Go to Project Home -> "Generate Episode".
- [ ] **Action**: Click "Suggest Ideas".
- [ ] **Verify**: 3 options appear.
- [ ] **Action**: Select one idea.
- [ ] **Action**: Click "Start Generation".
- [ ] **Verify**: Modal closes, redirected to Episode Editor/Storyboard.
- [ ] **Verify**: List of cuts appears with text descriptions.
- [ ] **Action**: Click "Generate All" (or Generate on individual cut).
- [ ] **Verify**: Toast: "Starting Batch Generation".
- [ ] **Wait**: Wait for images to appear.
- [ ] **Verify**: Images populate.

## 4. Episode Review (Mobile View)
- [ ] **Action**: Click "Preview" (Mobile Icon).
- [ ] **Verify**: Mobile Mockup viewer opens.
- [ ] **Action**: Scroll down through the cuts.
- [ ] **Verify**: Images and text are displayed correctly.
- [ ] **Action**: Close viewer.
