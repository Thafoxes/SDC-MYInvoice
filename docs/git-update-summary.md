# NudgeWise update summary

Date: 24 October 2026

## Git scope

This report covers the seven commits on local `Big-feature` after its tracked remote reference, `origin/Big-feature`, through commit `673f486`. These updates were also present on `feature-minor-fix` when this report was prepared.

The comparison contains **45 changed files, 2,462 insertions and 134 deletions**, including source code, tests, documentation, demo PDFs, preview files and the SQL export. These counts exclude this report.

Remote status is based on locally stored Git references; no fetch or push was performed for this report. Both `origin/Big-feature` and `origin/big-feature` appear in the local references, so their capitalization matters when choosing the push destination.

## What changed

### 1. Clearer quotations, invoices and order documents

- Reworked generated PDFs to show items in a readable table with quantities, prices, discounts and totals.
- Included buyer and seller contact information, including addresses and phone numbers, with missing details represented appropriately.
- Improved the quotation-to-order workflow so agreed quotation details can supply order items instead of requiring repeated entry.
- Expanded draft review and seller exception handling for differences between calculated item totals and the entered document total.
- Updated the workflow manual to explain how to review and approve orders.

Main files: `src/lib/documentPdf.ts`, `src/lib/customerOrders.ts`, `src/lib/orderWorkflow.ts`, `src/components/OrderWorkspace.vue` and `src/components/PurchaseOrderForm.vue`.

### 2. Seller/company settings

- Added a Settings page and sidebar entry for company name, address, phone, email and the salesperson preparing documents.
- Connected saved company information to sales documents.
- Replaced manual supplier entry on new orders with the current company's seller details.
- Added an editable fictional demo company profile: Kedai Maju Jaya Sdn Bhd.

Main files: `src/views/SettingsView.vue`, `src/lib/businessSettings.ts`, `src/lib/companyProfile.ts`, `src/components/AppSidebar.vue` and `src/router/index.ts`.

### 3. Final receipts and order completion

- Added invoice and final-receipt viewing, printing and downloading from Invoice Details and the order workspace.
- Added a final settlement receipt snapshot with recorded payment details.
- Added a completion procedure that checks settlement, the current final receipt, delivery acceptance and outstanding holds.
- Improved the order stage presentation so payment and completion steps reflect the recorded state.
- Updated MariaDB persistence to retain the new settlement data.

Main files: `src/components/InvoiceDocuments.vue`, `src/components/InvoiceDetailDrawer.vue`, `src/lib/invoiceDocuments.ts`, `src/lib/settlement.ts` and `src/presentation/orderStages.ts`.

### 4. Quick sale / direct invoice

- Added **Invoices > New quick sale / invoice** for immediate POS-style or small B2B sales.
- Allows an invoice to be issued without first creating a quotation or uploading a buyer PO.
- Reuses customer selection and company settings and retains a supporting order record for delivery and later adjustments.
- Supports **Paid immediately** and **Pay later / credit sale**.
- Paid-immediately sales require explicit funds and goods-handover confirmation before recording payment, issuing the receipt and completing the sale.
- Credit sales retain their outstanding balance and allow payments to be recorded later.

Main files: `src/views/QuickSaleView.vue`, `src/lib/quickSale.ts`, `src/views/InvoicesView.vue`, `src/services/commands.ts` and `server/app.cjs`.

### 5. Screenshot/PDF order extraction and payment attachments

- Added screenshot and PDF extraction to Quick sale using local Docling and the configured AI model.
- Proposes requested items, quantities and explicitly shown prices; missing prices need manual entry.
- Requires review of extracted items before issuing an invoice. Extraction failure retains the original and allows manual entry.
- Added optional bank-transfer/card receipt image or PDF attachments to quick sales and later recorded payments.
- Retains links to the original proof in Invoice Details and payment history.
- Stores payment proof without OCR or sending its contents to the cloud extraction model.
- Checks attachment ownership and uses server-stored file metadata rather than trusting submitted filenames.

Main files: `server/integrations.cjs`, `server/app.cjs`, `src/services/commands.ts`, `src/views/QuickSaleView.vue`, `src/components/InvoiceDetailDrawer.vue` and `src/lib/actions.ts`.

### 6. Demo materials and database export

- Added a reusable fictional buyer PO with three items and a matching total of **MYR 1,520.00**: `output/pdf/demo-buyer-purchase-order.pdf`.
- Added a quotation PDF and PDF generation/preview artifacts for demos and inspection.
- Added `database/BACKUP_V1.sql`, an SQL database export containing schema definitions. Its header identifies MySQL 8.4.3 as the source server.

The SQL export contains `DROP DATABASE` and `DROP TABLE` statements. Importing it can replace an existing database; it should not be treated as an incremental migration.

## Commit list

All seven commits are dated 24 October 2026. Listed oldest first:

| Commit | Original commit message | Main change |
| --- | --- | --- |
| `0e41575` | Remake the PDF quotation and invoice generation | PDF layouts, draft review and quotation/order workflow |
| `40bcae3` | added setting siebar for supplier/seller info | Seller settings page and document integration |
| `5391bf1` | added final summary after paid invoice | Final receipt, settlement and completion controls |
| `cd489a9` | added company as supplier/seller | Own-company supplier details and demo profile |
| `63b4f8b` | added OCR for invoices order | Quick sales, order extraction and payment-proof attachments |
| `de0f599` | added demo | Sample PO, quotation and preview artifacts |
| `673f486` | added db structure | SQL database export |

## Validation and limits

During implementation, the quick-sale, settlement, workflow, business-logic, MariaDB-adapter, PDF, UI and settings test suites passed: **86 tests in total**. Typechecking and the production build also passed. The build reported a JavaScript bundle-size warning.

Those results are from the earlier implementation checks; tests were not rerun while writing this report. Live Docling/Gemma extraction was not retested for the latest quick-sale upload feature. The sample PO was visually inspected and its text and total checked.

Payment attachments remain supporting evidence: a receipt image does not independently verify settled funds. The seller must confirm payment before recording it as received. The database export was not imported or restore-tested for this report.

For usage instructions, see [Customer order workflow](customer-order-workflow.md).
