# E2E Test Scenario

## 1. Project Creation
- [ ] **Create New Project**
    - Click "Start a New Toon"
    - Enter Title: "The Galactic Barista"
    - Enter Summary: "A barista serving aliens in space."
    - Select Genre: "Sci-Fi"
    - Click "Next" -> "Next" (Skip Worldview for now or use Auto) -> "Create Project"
    - **Verify**: Redirected to Project Home.

## 2. Character Casting
- [ ] **Create Main Character**
    - Go to "Characters" tab.
    - Click "Add Character".
    - Name: "Zorg"
    - Description: "Green alien with three eyes."
    - Click "Augment with AI" (Optional/Verify if enabled).
    - Click "Generate Portrait".
    - **Verify**: Image appears.
    - Click "Save Character".

## 3. Episode Generation
- [ ] **Generate Ideas**
    - Go to "Episodes" tab.
    - Click "Generate with AI".
    - **Verify**: 3 Options appear in Modal.
    - Select Option 1.
    - Set Cuts: 4.
    - Click "Create Episode".
    - **Verify**: Redirected to "Storyboard" / "Editor".

## 4. Storyboard & Cut Generation
- [ ] **Verify Cuts**
    - Check if 4 empty cuts are listed with scripts.
- [ ] **Generate Image for Cut 1**
    - Click "Generate" on Cut 1.
    - **Verify**: Loader spins, then image appears.
- [ ] **Review Mode**
    - Click "Review" button in toolbar.
    - **Verify**: Mobile Viewer opens.
    - Hover over Cut 1 -> Click Check (Approve).
    - Hover over Cut 2 -> Click X (Reject) -> Verify Red Border.
    - Close Reviewer.

## 5. Projects Validation
- [ ] **Dashboard Check**
    - Go back to Dashboard (Click Logo/Home).
    - **Verify**: "The Galactic Barista" appears in "Recent Projects".
    - **Verify**: Cover image is updated (if implemented) or placeholder exists.
