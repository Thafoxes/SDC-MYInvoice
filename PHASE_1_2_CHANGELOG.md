# NudgeWise — Phase 1 + 2 Changes

## Phase 1
- Fixed due-date checkpoint sign error.
- Persisted 21-day escalation checkpoints to prevent repeat alerts.
- Stopped rejected/cancelled checkpoints from silently returning.
- Implemented missed-promise alerts and expiry rules.
- Added full demo approval snapshot: message, recipient, invoice, payments/credits, and version.
- Revalidated the complete record immediately before simulated sending.
- Added local seller and business checks for actions (not a replacement for backend authorization).
- Blocked payments exceeding outstanding balance; dispute/payment claim cancels stale actions.
- Recorded simulated sends explicitly as **not delivered**.

## Phase 2
- Implemented customer priority rules in `src/lib/priorityEngine.ts`.
- Evidence includes invoice references, last-five settlement dates and review flags.
- Added sample settled payment histories for Green and Yellow.
- Added priorities + evidence/flags table to Dashboard, with badges in the invoice list.
- Kept exception-review urgency distinct from customer payment-history priority.

## Verification
- `npm run test:logic` compiles the business rules and runs 13 Node tests.
- No actual backend, Telegram delivery or AI integrations were connected.
- `npm run build` needs to be run on your machine.

## User upgrade note
- Back up `~/nudgewise` before copying files.
- Existing v1 localStorage data is not imported; v1.1 uses a different key and fresh synthetic seed data.
