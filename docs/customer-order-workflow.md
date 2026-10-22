# Customer lookup and purchase-order approval

Implemented for the synthetic seller demo. Start in **Customers** to find or add a customer, or **Purchase orders** to review and approve an incoming buyer PO reference. This records the buyer's PO; it does not issue one or upload the full order document into a permanent evidence store.

## Find or add a customer

Enter a phone number. Malaysian national numbers and their international equivalents match the same customer; other countries require an explicit country code. One match loads the record. Shared-phone matches require selection; they are never merged. Lookup stays within the current business and does not authenticate a customer.

If no record matches, enter the company name, phone, billing email, and optional address. With the backend enabled, a PDF, JPG, or PNG can supply proposed details through OCR and AI. Review and correct every field, then confirm before saving. Saving repeats the phone check so an edited OCR result cannot create a duplicate.

Customer OCR accepts up to 10 MiB and uses the existing worker's five-page limit. The uploaded file is temporary and deleted after extraction, including failure; only confirmed contact fields are saved. It is not retained as transaction evidence. Missing/ambiguous data stays editable and never authorizes an order automatically.

## Order hold

The order gate is separate from customer priority colours. It blocks approval when any customer invoice has:

- An active dispute, even if its adjusted balance is zero.
- A previous dispute and a remaining balance requiring settlement.
- An outstanding verification hold on that disputed obligation.

Ordinary overdue invoices alone do not trigger this particular policy. Only recorded payments and existing approved credit records reduce the balance; pending/flagged payments do not. Resolving a dispute alone does not clear its settlement requirement. After the dispute is resolved and settlement is confirmed, the next approval check can allow the order.

Old snapshots gain an empty order collection without a reset. Active disputes and available historical dispute events/replies restore the durable settlement marker. A historical dispute with no surviving evidence cannot be reconstructed automatically.

## Seller override

Seller or staff can save a buyer PO reference as a draft while held. Only the demo seller can approve processing. If held, a non-empty reason is required for an override. The order and activity log retain the reason, seller, time, and blocking invoice/balance snapshot.

The exception applies to that order only. It never clears invoice disputes, changes balances, releases reminder holds, or approves another PO. The backend repeats the eligibility check during approval rather than trusting an earlier screen result.

## Try the demo

1. Open **Purchase orders** and search `0133456789` (ABC Trading).
2. Review the hold for disputed invoice `INV-1013`.
3. Save a buyer PO reference, such as `PO-DEMO-001`.
4. Enter an override reason and approve this PO. Review the recorded exception.
5. Create a second PO for the customer: it still requires settlement or another seller decision.
6. Use the existing invoice drawer to record a synthetic settlement and resolve the dispute, then review eligibility again.
7. Try an unused phone to add a synthetic customer manually, or read a synthetic business document with the backend enabled.

## Run and verify

- Browser-only mode: set `VITE_BACKEND_ENABLED=false` and `VITE_TELEGRAM_ENABLED=false`, then run `npm run dev`. Manual intake and order approval use the existing browser store; OCR is clearly disabled.
- Backend mode: set `VITE_BACKEND_ENABLED=true`. Telegram is not required for the new features; set `VITE_TELEGRAM_ENABLED=false`. Run `npm run server` and `npm run dev`. Existing environment changes require restarting the relevant process.
- OCR additionally needs the existing `DOCLING_PYTHON`, `OLLAMA_API_KEY`, and `OLLAMA_MODEL` configuration. Incoming contact text is sent to the configured cloud model for extraction.
- Existing backend polling starts if a Telegram token is configured. To run this proof of concept without Telegram activity, leave `TELEGRAM_BOT_TOKEN` empty in the environment used for the backend. Email replacement remains a separate planned change.
- `npm run test:logic`: existing invoice/language checks plus phone, duplicate, hold, migration, scope, and override tests.
- `npm run test:customers`: mocked customer OCR and backend approval tests, including bounded file validation and cleanup. No paid model calls.
- `npm run build`: application typecheck and production build.

This remains a shared-access demo: role/name checks enforce the simulated business rules but do not authenticate a real seller. Do not use genuine business/customer records or treat an override as production authorization.

## Where to make changes

- `src/lib/customerOrders.ts`: phone matching, input validation, order eligibility, creation and approval.
- `src/lib/store.ts`: backward-compatible state migration and business-scoped balance calculations.
- `src/components/CustomerIntake.vue`: shared customer lookup and reviewed contact form.
- `src/views/OrdersView.vue`: order holds, draft references, approval and exception display.
- `src/services/commands.ts`: local/backend transport, independent backend setting, document upload helper.
- `server/app.cjs`: bounded document intake and business-scoped command routing.
- `server/integrations.cjs`: OCR + model customer extraction and output validation.
- `tests/customer-orders*.test.cjs`: domain and backend regression checks.

For the full project relationships, see [the navigation guide](project-map.md) and [Graphify report](../graphify-out/GRAPH_REPORT.md).
