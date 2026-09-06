# UI rules

## Selection dropdowns

Use `components/Dropdown.tsx` for value selection, not native select elements or a new custom popup. The closed control and popup fill the available container width. Keep the caption above the control; use the shared rounded border, spacing, colors, hover/focus, and disabled states. Options can include icons, small descriptions, and right-aligned metadata or real shortcut badges. Keyboard navigation, Escape, and focus return must work.

Use `ModelPicker` for transcription models. Group **Downloaded** models first, then a divider and **Not downloaded** models. Use caption styling for group headings. Show size only for missing models; retain Experimental metadata and language descriptions. Never add per-row Downloaded/Not downloaded labels. Determine availability from the cache; selecting or opening a menu must not download a model. Unsupported transcription languages remain disabled.

## Buttons

Use `components/Button.tsx` for custom actions:

- **Regular** (default): the original Split/Delete/Restore style. Compact, transparent, rounded corners, small icon and label, subtle hover background, subdued disabled state. Use this for routine actions and both Cancel and Transcribe in the retranscription modal.
- **Accent**: the original Export style. Filled, pill-shaped, high contrast. Reserve for a prominent primary action; do not make every custom action accent.
- **Icon**: the Settings style. A square, transparent button with rounded corners and a subtle hover background. Use for meatballs menus. Always provide a localized accessible label and tooltip.

Reuse `Shortcut` for shortcut badges. Display only real existing shortcuts; never invent a shortcut as decoration. Icons supplement text rather than replacing accessible names.

## Action menus and favorites

Use `ActionMenu` for commands, separate from value-selection Dropdowns. Every command has an icon and label; show its shortcut when one exists. Preserve the original action, selection, disabled rules, and error handling. Support arrow keys, Home/End, Escape, and outside dismissal.

The timeline meatballs sits after favorite tools and before the zoom divider. Split, Delete, Restore, and Retranscribe are menu commands. Split, Delete, and Restore are favorites by default. Hover or keyboard-focus a command icon to reveal its star; clicking toggles its favorite without executing the command. Favorites appear above the timeline and persist locally across sessions. A disabled command can still be pinned. Unpinning hides only the shortcut button, never the menu command.

The top meatballs replaces Export. Move Save, Open, Save As, project location, Close Project, Export, and processing pause/resume into it. Keep Undo/Redo and Settings in place; remove the divider after Undo/Redo. Top actions have no favorites yet. Leave room for readable process status instead of truncating it to a narrow fixed width.

Localize new labels. Check light/dark themes, pointer and keyboard use, narrow windows, selection preservation, and persistent favorites. Use these shared components for future custom controls instead of copying classes.
