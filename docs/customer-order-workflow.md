# Customer lookup and purchase-order approval

Implemented for the seller proof of concept. Start in **Customers** to find or add a customer, or **Purchase orders** to upload, review, save and approve an incoming buyer PO. It records the buyer's document rather than issuing one.

## Empty workspace and recovery

The app starts without sample customers, invoices, payments, orders, messages or notifications. Resetting returns to an empty workspace. The minimum workspace/seller configuration remains so the app can operate. Synthetic regression records live only in `tests/fixtures/business-data.json` and are loaded explicitly by tests.

On the first upgrade, known sample IDs and their linked transactions are removed; manually created customers and orders are retained. A recovery copy of the prior state is stored under `nudgewise-demo-v1.1-before-sample-cleanup` in the browser or backend state table. The existing local database was also backed up under `.local-data/backups/` before cleanup. Do not commit backups or original business documents.

## Full PO entry and original evidence

Upload a PNG, JPG or PDF in **Purchase orders**, or enter the fields manually. OCR proposes the reference, dates, buyer/supplier contacts and addresses, delivery instructions, terms, requested-by/approved-by names, department, notes, line items and printed total when visible. Buyer and supplier are distinct: a supplier email is not a customer billing email.

The original file bytes are stored in SQLite's `po_evidence` BLOB table with a SHA-256 hash, filename, content type, business and upload time. Repeated uploads of identical bytes reuse the evidence record within that business. Saving the PO links its evidence ID; use **Open original PO evidence** after reopening the order. The original remains unchanged when reviewed fields are corrected. It is not included in browser state snapshots.

PO extraction enables Docling table recognition. Duplicate item rows are retained. Check each quantity, price and discount (an amount per line), and explicitly confirm the three-letter currency. A bare `$` does not establish USD. Calculated totals use rounded line values; a disagreement with the entered printed total prevents processing approval until corrected. A printed status such as “Closed Completed” or an approver's name is source text, not NudgeWise approval.

All fields remain editable on a draft; save changes before approval. Approved POs are read only. If AI extraction fails, the original is still retained and a manual-entry path is shown. The current worker is limited to five pages and 10 MiB. It may miss a footer total or other text, so missing fields must be confirmed manually.

The supplied `tests/fixtures/PO.png` was checked with real local OCR and the approved Ollama cloud model: reference PO00495, distinct buyer/supplier and seven item rows were extracted. Currency remained unknown and the footer total was not extracted. The line items calculate to 228.47.

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

1. Open **Purchase orders** and upload a PO; review the original and proposed fields.
2. Choose **Use these buyer details to find or add customer**, confirm the phone country code, and find the customer.
3. Review or add the customer. Email is optional when it is absent from the document.
4. Correct the PO fields, line items, printed total and currency; confirm review and save the draft.
5. Review eligibility and approve processing. A hold requires settlement/resolution or a reasoned seller exception for that PO.
6. Reopen the saved order and open its original evidence. An exception does not release old invoice holds or future orders.

## Run and verify

- Browser-only mode: set `VITE_BACKEND_ENABLED=false`, then run `npm run dev`. Manual intake and order approval use the existing browser store; OCR is clearly disabled.
- Backend mode: set `VITE_BACKEND_ENABLED=true`. Run `npm run server` and `npm run dev`. Existing environment changes require restarting the relevant process.
- OCR additionally needs the existing `DOCLING_PYTHON`, `OLLAMA_API_KEY`, and `OLLAMA_MODEL` configuration. Incoming contact text is sent to the configured cloud model for extraction.
- `npm run test:logic`: existing invoice/language checks plus phone, duplicate, hold, migration, scope, and override tests.
- `npm run test:customers`: mocked customer OCR and backend approval tests, including bounded file validation and cleanup. No paid model calls.
- `npm run test:po`: empty-start/sample-cleanup checks, exact PNG evidence retention across restart, extraction failure, business isolation, numeric validation and draft/approval checks.
- `npm run build`: application typecheck and production build.

This remains a shared-access demo: role/name checks enforce the simulated business rules but do not authenticate a real seller. Do not use genuine business/customer records or treat an override as production authorization.

## Where to make changes

- `src/lib/customerOrders.ts`: phone matching, input validation, order eligibility, creation and approval.
- `src/lib/store.ts`: backward-compatible state migration and business-scoped balance calculations.
- `src/components/CustomerIntake.vue`: shared customer lookup and reviewed contact form.
- `src/views/OrdersView.vue`: order holds, draft references, approval and exception display.
- `src/components/PurchaseOrderForm.vue`: complete editable PO form, upload, evidence link and item table.
- `src/lib/purchaseOrder.ts`: PO field validation and line/total calculations.
- `src/services/commands.ts`: local/backend transport, independent backend setting, document upload helper.
- `server/app.cjs`: bounded document intake and business-scoped command routing.
- `server/integrations.cjs`: OCR + model customer extraction and output validation.
- `tests/customer-orders*.test.cjs`: domain and backend regression checks.

For the full project relationships, see [the navigation guide](project-map.md) and [Graphify report](../graphify-out/GRAPH_REPORT.md).
