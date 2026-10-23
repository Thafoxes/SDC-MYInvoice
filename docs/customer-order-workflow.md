# Customer lookup and purchase-order approval

Implemented for the seller proof of concept. Start in **Customers** to find or add a customer, or **Purchase orders** to upload, review, save and approve an incoming buyer PO. It records the buyer's document rather than issuing one.

## Empty workspace and recovery

The app starts without sample customers, invoices, payments, orders, messages or notifications. Resetting returns to an empty workspace. The minimum workspace/seller configuration remains so the app can operate. Synthetic regression records live only in `tests/fixtures/business-data.json` and are loaded explicitly by tests.

On the first upgrade, known sample IDs and their linked transactions are removed; manually created customers and orders are retained. A recovery copy of the prior state is stored under `nudgewise-demo-v1.1-before-sample-cleanup` in the browser or backend state table. The existing local database was also backed up under `.local-data/backups/` before cleanup. Do not commit backups or original business documents.

## Full PO entry and original evidence

Upload a PNG, JPG or PDF in **Purchase orders**, or enter the fields manually. OCR proposes the reference, dates, buyer/supplier contacts and addresses, delivery instructions, terms, requested-by/approved-by names, department, notes, line items and printed total when visible. Buyer and supplier are distinct: a supplier email is not a customer billing email.

The original file bytes are stored in SQLite's `po_evidence` BLOB table with a SHA-256 hash, filename, content type, business and upload time. Repeated uploads of identical bytes reuse the evidence record within that business. Saving the PO links its evidence ID; use **Open original PO evidence** after reopening the order. The original remains unchanged when reviewed fields are corrected. It is not included in browser state snapshots.

PO extraction enables Docling table recognition. Duplicate item rows are retained. Check each quantity, price and discount (an amount per line), and explicitly confirm the three-letter currency. A bare `$` does not establish USD. Calculated totals use rounded line values; a disagreement with the entered printed total requires correction or an explicit seller override before processing approval. A printed status such as “Closed Completed” or an approver's name is source text, not NudgeWise approval.

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

Seller or staff can save a buyer PO reference as a draft while held. Only the demo seller can approve processing. If held, or if calculated line totals differ from the printed total, a non-empty reason is required for an override. The seller must confirm the exception in a confirmation dialog. Total exceptions retain the calculated and printed amounts in the order and activity history; they do not change either amount. The order and activity log retain the reason, seller, time, and blocking invoice/balance snapshot.

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

## Approve a reviewed order with an exception

1. Open the draft order in edit mode. Save any unsaved changes first.
2. Review the displayed customer hold and/or calculated-versus-printed totals.
3. Correct mistakes when possible. For a direct order with no buyer PO, leave the printed total blank rather than inventing a document total.
4. If the seller decides the order can proceed despite a hold or total difference, enter a specific reason under **Reason for allowing this order**.
5. Click **Approve this order with override**. Review the order reference, totals (when applicable), and reason in the confirmation dialog, then confirm or cancel.
6. The approved order shows the exception, seller, time and any total discrepancy. Approval makes the order read only. This does not settle invoices, clear disputes, or authorize future orders; delivery and invoicing retain their own checks.

Seller identity remains simulated in this demo. An override is a recorded processing exception, not evidence of buyer acceptance or bank settlement.

## Direct orders, quotations and revisions

A buyer does not need to issue a PO. Choose **Create order**, select the customer, and enter the requested items (or review a chat screenshot). Prices may be blank initially. **Total printed on buyer’s document** is optional: leave it blank when there is no buyer PO. It is a monetary total from a real document, not an item count or quotation number. For example, items worth MYR 760 and a document total entered as MYR 1 differ by MYR 759; correct that field or clear it when there is no document total.

1. Save the order draft. The quotation starts with the order / PO items. **Copy items and terms from order / PO** reloads those values into the quotation editor; it does not save automatically.
2. Edit quotation items, quantities, unit prices, line discounts and terms. Sent, rejected and revision-requested quotations remain editable until accepted. Saving a revision resets it to draft and preserves the previous quotation in activity history.
3. Save all quotation edits before recording a buyer response. Record a request/revision note if needed. Uploading evidence is optional; an agreement screenshot or request can be uploaded directly beside the response form.
4. For **Accepted**, either enter how the buyer agreed or select attached evidence. Seller confirmation is still required; uploading a file alone does not approve anything.
5. Acceptance copies the quotation’s item rows, currency and payment terms into the order. Use **Copy agreed quotation to order** to apply an already-accepted quotation to an existing order before delivery or invoicing. The original uploaded PO and its printed total are retained as evidence. Accepted quotation items and terms are locked.
6. If copying changed an already-approved order, it returns to draft and needs seller processing approval again. Review totals and customer holds; correct the optional document total or record a reasoned exception where appropriate.
7. Continue with delivery and invoicing. The invoice uses the accepted quotation amount. Later delivery/invoice records cannot be rewritten through quotation edits.

## Downloading order, quotation and invoice PDFs

The document download buttons include supplier and buyer names, addresses, phone numbers and emails. Buyer contacts use the saved customer record, with order/PO fields as a fallback; supplier contacts use saved Settings first, with order/PO fields as a fallback. Missing values print as `-`. Use **Settings** to save the seller name, address, phone and email.

Items print in a bordered table: item/code, quantity, unit price, line discount and line total. Unknown prices print as `-`; long tables repeat their headers on subsequent pages. Invoice items use the quotation when available. These demo PDFs use built-in ASCII fonts; multilingual documents require a Unicode-capable renderer.

## Seller settings and document preparer

Open **Settings** in the sidebar. Fill in the supplier/seller name, address, phone, optional email, and **Salesperson / prepared by**, then click **Save settings**. The seller name is required; other contact fields can be left blank. PDF contact sections prefer these saved settings over uploaded PO supplier fields, and use `-` when neither source has a value.

The salesperson setting is a document name, not a login or permission change. Leaving it blank uses the seller account name. New quotations keep the name recorded when created, including subsequent revisions. New invoices record the name set when issued. Later settings changes do not replace those recorded preparers. Older documents with no recorded preparer print `-`.

Settings use the current workspace's persistence: browser localStorage in browser-only mode, or the backend database when enabled. Seller contacts project to the existing MariaDB business columns; salesperson and per-document preparer names are retained in the runtime snapshot without requiring new schema columns. Resetting the demo resets settings as well as transactions.

## Paid invoice, final receipt and order completion

Invoice Details now contains **View / print invoice PDF** and download buttons. PDF views open in a new tab; use the PDF viewer’s Print action. The same document controls are available under the order’s **Payment and receipt** section.

1. Record a payment only after checking actual bank/payment-provider records or receiving cash. Confirm this in the payment dialog. Existing manually recorded payments already reduce the invoice balance; do not record them again to obtain a receipt.
2. When the balance is zero, finish any outstanding payment-claim review, verification hold, dispute or open review case. Enter the verification source/settlement note, confirm the funds/credits check, and click **Confirm settlement and issue final receipt**.
3. **View / print final receipt** opens the final settlement document. It lists the original invoice amount, debit adjustments, credit adjustments, actual recorded payments, references and seller confirmation. Credits are not described as cash received; an entirely credited invoice produces a settlement statement.
4. Record delivery acceptance for every item, or explicitly resolve each shortfall using the delivery/credit-note workflow. A paid invoice is not proof that delivery happened.
5. Click **Complete order** and confirm. The server rechecks processing approval, quotation acceptance, delivery, payment review, the settled balance and the current final receipt. Remaining blockers are listed with a link to the order.

Issuing a receipt does not post a payment. Repeating issuance for the same settlement reuses the receipt. Extra charges or financial changes invalidate its use for current completion; earlier settlement information remains in the audit history. After the additional balance is settled, issue an updated final receipt and reconfirm completion. All of this remains seller-recorded: the app does not contact your bank or provide production authentication.
