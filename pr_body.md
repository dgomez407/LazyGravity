## Summary

Implements robust CDP detection and Discord integration for the new interactive "Question Modal" UI introduced in Antigravity IDE. This allows users to receive and respond to multiple-choice prompts natively within Discord via drop-down select menus, resolving blocks where the IDE awaits human decision.

## Problem

Antigravity IDE updated its UI to present certain decision points (like clarifications or ambiguous steps) as a multiple-choice list with a "Submit" button, rather than simple binary allow/deny buttons. The existing approval detector (`ApprovalDetector`) was unable to interpret this new UI structure, leaving Discord users blind to these questions and causing the IDE execution to appear indefinitely stalled.

## Solution

- **Robust DOM Polling (`QuestionDetector`)**: Added a new polling detector that continuously scans the IDE DOM for the specific footprint of a multiple-choice question (e.g., lists using ARIA roles like `listbox`, `radiogroup`, or `ul`/`li` paired with a submit button).
- **Coordinate-based Submission**: Overcomes Electron DOM event filtering by retrieving precise coordinates for both the selected option and the submit button, then dispatching raw CDP `Input.dispatchMouseEvent` events to accurately simulate user clicks.
- **Discord Select Menu Integration**: Upgraded the Discord payload builder to map the IDE question options into a Discord `StringSelectMenuBuilder`. This provides a rich, native interaction experience for users to select their answer.
- **Cross-Component Wiring**: Seamlessly wired the new detector into the existing session lifecycle via `CdpConnectionPool` and `CdpBridgeManager`, routing Discord select interactions back to the active CDP session.

## Testing

Automated validation:
- Validated via `npm run build` with zero TypeScript errors to ensure integration contracts hold.
- Ensured existing unit tests for Python (`pytest`) and `jest` suites remained unimpacted by the new components.

Live validation:
- Confirmed that the `QuestionDetector` successfully identifies the question UI without false positives.
- Verified that interacting with the Discord select menu successfully maps back and triggers the correct CDP coordinates to select the option and submit the form in the IDE.

## Files Changed

- `src/services/questionDetector.ts` (New)
- `src/handlers/questionSelectAction.ts` (New)
- `src/services/cdpBridgeManager.ts`
- `src/services/cdpConnectionPool.ts`
- `src/services/notificationSender.ts`
- `src/bot/index.ts`
- `src/bot/telegramMessageHandler.ts`
- `src/events/interactionCreateHandler.ts`

## Risk

Low. The feature is strictly additive. The new detector runs in parallel with existing detectors (like `ApprovalDetector`), meaning legacy prompts remain unaffected, and all logic is cleanly encapsulated.
