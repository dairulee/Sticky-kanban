# Sticky Kanban v5 — fixed build

This is the corrected v5 build. The v5 controls are now part of the Sticky editor itself instead of being injected afterward.

## Included
- Due date + due time
- Reminder option
- Repeat option
- Pomodoro focus length
- Pomodoro timer and completed-focus count
- Existing v4/v3 boards migrate in place using the same localStorage key
- Service worker uses a new cache and network-first navigation so updates appear more reliably

## Reminder limitation
Reminder choices are stored/displayed, but true lock-screen push notifications are intentionally not enabled yet.
