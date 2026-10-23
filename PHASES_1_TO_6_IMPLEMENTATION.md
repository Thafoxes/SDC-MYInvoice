# NudgeWise Phases 1–6 — Integrated Local MVP

## Status and scope (23 October 2026)

This is a **working source-code MVP extension**, not a claim that every production-level feature in Phases 1–6 has been completed or live-tested. It builds on `NudgeWise_UI_AI_Fixes_2026-10-23.zip`. It preserves Vue 3, the Node.js server, and existing SQLite persistence. The separate XAMPP MariaDB schema from Phase 0 is **NOT CONNECTED**. There is NO new Transaction page/table. `purchase_orders` anchor the order workspace.

### Implemented

- **Phase 1:** PO listing with search, created date, customer, amount, current stage, and View Details; separate Create New PO and Upload Existing PO entry points; select existing customer via dropdown; direct Add Customer via expansion.
- **Phase 2:** NudgeWise AI Assistant accepts general/business/PO/quotation/invoice questions through the existing local/cloud Ollama backend; `AI_PROVIDER=off|ollama|cloud|auto`; `CLOUD_AI_MODEL` optional; screenshot OCR proposes *item name and quantity* and leaves price unconfirmed; seller edits and confirms. Existing PO uploads retain the original and do not regenerate it.
- **Phase 3:** PO details show progress through PO, quotation, buyer confirmation, invoice, payment and receipt; buyer details, original evidence, activity timeline, optional delivery evidence and seller review.
- **Phase 4:** Seller-reviewed quotation draft with prices, payment/delivery terms, expiry, and recorded buyer outcome. Downloadable basic A4 PDFs for draft PO, quotation, invoice tracking copy and verified payment receipt. PDF layout is basic ASCII/Helvetica and requires a proper business template for production.
- **Phase 5:** Seller-created invoice tracking record from an accepted quotation; partial payment *claims*; payment verification holds; seller-approved settlement updates and receipt records. No provider/bank reconciliation, statutory e-invoicing or automatic transmission.
- **Phase 6:** Deterministic missing acceptance, delivery quantity mismatch, open dispute and unverified claim blockers; seller-owned dispute resolution, human approval and activity records. A lightweight keyword-based evidence snippet retrieval layer supports grounded AI answers from OCR-extracted text. This is **NOT** a full embedding/vector RAG implementation. Uploaded evidence is untrusted and never authorizes changes.

### Not implemented / must still be completed

- Phase 0 MariaDB integration: despite having imported 29 MariaDB tables, the Node.js app **still uses SQLite**. Changing the DB requires mapping the store to relational MariaDB and migration tests.
- Phase 7 live email sending/receiving and buyer reply confirmation: **not included**. PDFs download; the seller sends them manually.
- Multi-tenant production authentication, provider payment verification, legal/statutory invoice issuance, real-world buyer acceptance, complex split deliveries, repeat item-name delivery allocation, cloud key validation and production OCR accuracy: **not demonstrated**.
- Existing Telegram-specific legacy tests include expectations of automatic receipt settlement. That legacy behavior was intentionally disabled for safety and those tests need to be revised or retired along with the obsolete Telegram integration.

## Ubuntu installation (new clean folder)

Download `NudgeWise_Phases_1_to_6_Integrated.zip` to `~/Downloads`, then:

```bash
sudo apt update
sudo apt install -y unzip python3 python3-venv python3-pip
cd ~/Downloads
unzip -o NudgeWise_Phases_1_to_6_Integrated.zip -d ~/NudgeWise-Phase16
cd ~/NudgeWise-Phase16/SDC-MYInvoice-db
node -v   # Node.js >= 24 required by this project
npm install
[ -f .env ] || cp .env.example .env
nano .env
```

In `.env`, set/keep:

```dotenv
VITE_BACKEND_ENABLED=true
VITE_TELEGRAM_ENABLED=false
AI_PROVIDER=auto
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
AI_TIMEOUT_MS=30000
DOCLING_PYTHON=.venv/bin/python
# For cloud fallback, put the API key in backend-only CLOUD_AI_API_KEY=...
# CLOUD_AI_MODEL=...   # a model you know is available in your cloud account
```

**Never put cloud keys in VITE_* settings, screenshots, or Git.** `.env` is intentionally not included in the ZIP. If the previous project already has a configured `.env`, copy just that file into the new project folder manually. Do not accidentally overwrite it with `.env.example`.

Create the Python environment specifically for OCR:

```bash
python3 --version
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r server/requirements.txt
.venv/bin/python -c "import docling; print('Docling import OK')"
```

Python packages can be large. Use Python 3.11 or 3.12 if your system version is incompatible with the pinned Docling dependencies. Verify the installed interpreter path with `ls -l .venv/bin/python`. Python is for OCR; the website/backend run on Node.js.

If you want local Ollama:

```bash
ollama list
ollama pull llama3.2:3b        # only if missing
ollama run llama3.2:3b        # confirm a real reply, then exit
```

**Start two terminal windows:**

Terminal 1:
```bash
cd ~/NudgeWise-Phase16/SDC-MYInvoice-db
npm run server
```
Terminal 2:
```bash
cd ~/NudgeWise-Phase16/SDC-MYInvoice-db
npm run dev
```

Open the URL Vite displays (typically `http://127.0.0.1:5173`). Ensure Node.js is 24 or newer. Be sure not to run this alongside another server using port 8787 or Vite using 5173.

## End-to-end manual smoke test

1. Open **Customers** and create a synthetic test buyer.
2. Open **Purchase orders → + Create New PO**; select buyer. Enter a manual item, or upload a chat screenshot to **Extract requested items** (Python Docling + Ollama are required for screenshot extraction). Prices can remain blank at this stage. Tick seller review checkbox and save draft PO.
3. Click **View Details** for the saved PO and approve its processing as seller. Approval of processing is **not** buyer approval.
4. In **Quotation**, enter item prices, payment terms, delivery terms, validity, then save quotation. Download PDF if desired; sending email is Phase 7.
5. Under buyer response, select **Accepted**, record how the buyer accepted (or attach buyer approval evidence), then submit seller record.
6. Create an invoice tracking record with number and confirmed issue/due dates. Download invoice tracking PDF. Optional: record partial delivery acceptance to demonstrate quantity mismatch blocker before invoicing.
7. In **Payment claims**, record a synthetic claim. The invoice remains unpaid until seller records verification against a trusted source. Verify or reject using a reason. A verified payment creates a receipt record and PDF download.
8. In **AI Assistant**, ask “What is 2 + 2?” and “Explain PO-... blockers” (requires actual configured Ollama service). The banner is configuration information, **not a verified provider health check**.

## Automated checks run in creation environment

- `npm run build` — passed
- `npm run server:build` — passed
- `npm run test:logic` — 27 passed
- `npm run test:ui` — 6 passed
- `npm run test:customers` — 7 passed
- `npm run test:po` — 8 passed
- `npm run test:workflow` — 4 passed
- `npm run test:ai-v2` — 3 passed
- `npm run test:telegram` — **legacy suite still has failures** because it expects older cloud API behavior and automatic Telegram receipt settlement. Do not treat that suite as current acceptance coverage; remove/rewrite the legacy integration before production.
- Basic PDF generation validated with `pdfinfo` and `pdftotext` using a generated A4 sample.

No live local Ollama, cloud AI key, user's Ubuntu runtime, actual browser interactions, MariaDB persistence, or statutory compliance was tested in the creation environment.

## Security / data handling caveats

The demo API uses a shared passcode/local-access boundary, NOT real user authentication. Use synthetic data. Evidence access controls are only suitable for the current local demo; OCR text and buyer messages must be treated as untrusted evidence. User-supplied attachments can contain personal/business details. Protect local SQLite files, uploaded evidence and environment keys; never deploy the current demo backend publicly as a multi-tenant product.
