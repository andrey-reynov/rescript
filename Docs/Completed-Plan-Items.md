# Completed plan items

Acceptance records for requirements removed from the pending plan. Completion applies only to the listed scope.

## Item 10 — Project Manager buttons and revision modal

Verified 2026-09-06 in an isolated production-built Electron app. Components: `ProjectLibrary.tsx`, `RevisionDialog.tsx`, `UploadScreen.tsx`, and shared `Button.tsx`.

- Open project uses the shared Accent button. Activating it called the native project picker; selecting the fixture `.rescript` file opened the expected transcript. The picker selection was supplied by the test adapter; normal project reading/opening was unchanged.
- Folder and revision buttons use the shared icon style. Both showed the hover background and 0.95 pressed scale. Both activated from the keyboard. Folder reveal received the correct project path and neither icon opened the project card. The test adapter captured folder reveal instead of opening Explorer.
- The revision dialog has an accessible top-right X, no bottom Cancel, initial focus on X, Tab/Shift-Tab containment, visible keyboard focus, Escape dismissal, and focus return to the triggering card button. Closing without choosing a revision preserved current project data.
- At a 900×500 viewport with 20 revisions, the list had 804px of content within a 272px scroll area. Scrolling kept title, description and X at exactly the same coordinates. Light and dark screenshots were inspected after transitions settled.
- Choosing the prepared previous revision opened its expected text. The native recovery backup retained the prior current text. The fixture's original data was restored after the test.
- Simulating a snapshot disappearing after opening the list showed a localized error inside the dialog, preserved current project data, and left close/retry controls available. Focus recovered after the failed restore, and Escape closed the dialog. The snapshot fixture was restored in a finally block.
- Renderer type checks, localization tests, production build, and changed-component lint pass (the pre-existing ProjectLibrary thumbnail warning remains).

### Original requirements

**Status:** Complete; verified above.

**Expected behavior:**

- Restyle the Project Manager's **Open project…** button using the shared **Accent** button variant from UI-Rules.md.
- Add consistent hover and pressed/click feedback to the folder and revision buttons on project cards, using the shared icon-button styling. Preserve their existing actions and prevent their clicks from also opening the project card.
- In the revision modal, add an accessible **X** close button in the top-right corner using the shared icon-button style.
- Remove the bottom **Cancel** button; retain the existing non-destructive dismissal behavior through the new X button.
- Keep the modal title, close button, and description stationary. Restrict scrolling to the revision list itself, with a height bounded by the available viewport.

**Acceptance criteria:**

- Open project… matches the Accent style and retains its existing opening behavior.
- Folder and revision buttons visibly respond to hover and press, remain keyboard accessible, and trigger only their own actions.
- The revision modal closes from the top-right X without selecting or restoring a revision; no bottom Cancel button remains.
- With many revisions or a short window, only the list scrolls. The title, description, and X remain visible and usable.
- Revision selection/restoration continues to work; verify light/dark styling and visible keyboard focus.

**Tracking:** No issue assigned yet.

