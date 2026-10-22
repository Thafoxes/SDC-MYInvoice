# Local Telegram receipt test

This optional mode connects the Vue demo to a loopback Node API, SQLite, Telegram long polling, Docling OCR and **`gemma4:31b`** through the direct Ollama cloud API. The AI Assistant also uses this model when enabled. Use synthetic receipts and a dedicated test bot.

## Setup

1. Use **Node 24+** and **Python 3.12**. Install the project dependencies with `npm install`.
2. Create the OCR environment (Windows):

   ```powershell
   py -3.12 -m venv .venv-telegram
   .venv-telegram/Scripts/python.exe -m pip install -r server/requirements.txt
   ```

   On macOS/Linux use `python3.12 -m venv .venv-telegram` and `.venv-telegram/bin/python`. The first conversion can download Docling/OCR models. No external OCR API is used.

3. Copy `.env.example` to `.env`, **or merge the missing settings if `.env` already exists**. Set:

   - `VITE_TELEGRAM_ENABLED=true`
   - `TELEGRAM_BOT_TOKEN` from your dedicated BotFather test bot.
   - `OLLAMA_MODEL=gemma4:31b`
   - `OLLAMA_API_KEY` from https://ollama.com/settings/keys (server-side only)
   - `DOCLING_PYTHON` to the OCR environment's Python executable.
   - `RECEIPT_BENEFICIARY` to the exact account name on your synthetic receipt. Missing or mismatched names require review.

   Never prefix secrets with `VITE_`; those variables are public browser configuration. The supported UI business is the seeded `biz-001`.

4. The backend calls `https://ollama.com/api/chat` directly with your API key. You do not need a local Ollama installation, `ollama serve`, model downloads or local sign-in. The API model name is `gemma4:31b`, without the `-cloud` suffix. Requests require internet access and send submitted text to Ollama’s cloud. Remove the old `OLLAMA_HOST` setting; it is no longer used.

5. Run these in separate terminals:

   ```powershell
   npm run server
   npm run dev -- --host 127.0.0.1 --strictPort
   ```

   Open [Action Center](http://127.0.0.1:5173/#/action-center). Restart both servers after changing `.env`. If using a different frontend port, set `FRONTEND_ORIGIN` accordingly. The Vite `/api` proxy expects backend port 8787.

## Try the complete flow

1. In Telegram, open a private chat with your bot and send `/start`. It replies with your numeric chat ID once the API is polling.
2. In Action Center → **Telegram payment receipts → Link a test customer**, select a customer and enter that ID. Seeded IDs are placeholders and cannot send real messages without this explicit linking step.
3. For the quickest test, link **Chong Kah Mun**, whose seeded **INV-1006** has RM1,800 outstanding. Link the chat **before** approving the reminder. Linking invalidates existing approvals.
4. Approve the reminder, then click **Send to Telegram**. This sends the existing invoice reminder text, with its invoice number and balance. Other invoices can be prepared through Demo Controls → Run Invoice Check. Existing seller approval remains required.
5. Reply to that invoice message with a synthetic bank-transfer receipt as PDF, PNG or JPEG. Telegram photos are also accepted. Use a completed transfer, the expected beneficiary, a unique transaction reference and the exact outstanding balance.
6. Watch Action Center. An exact match records a synthetic payment and settles the invoice; other outcomes show **Requires seller attention**. Attachments can be downloaded for review. Marking a receipt reviewed does **not** record a payment or release a hold. Use View Invoice to record a seller-verified payment or review the hold separately.

For the committed fixtures in `tests/fixtures`, the PNG uses recipient `Test Seller` and the PDF uses `Siti Aishah`. Set `RECEIPT_BENEFICIARY` to the name expected for that fixture and restart the API. Both contain a synthetic RM1,800 transfer dated 2026-10-20, reference `TEST-TRANSFER-1`. Test each fixture with fresh demo data; reusing either receipt must not record another payment. Resetting clears chat links, so link again afterwards.

## Matching and failure handling

### Customer replies and promised payments

Ordinary Telegram text and attachment captions are now saved before Gemma classifies them. Payment claims, promises, extension requests, cash/other-method requests, instalments and disputes can have multiple flags in the same reply. AI never approves a new arrangement or records a payment from text. Unmatched replies and AI failures stay in Customer Responses for seller review; processing, failed or unclear replies pause reminders until reviewed.

Dashboard and Action Center share **Needs your attention**, covering all invoices, including invoices not overdue, plus unmatched replies/receipts. Verification comes before missed-promise warnings. Dashboard shows the first eight items by urgency with a View all control. Review links open the relevant message, receipt or invoice.

Relative dates use the original Telegram message time in the business timezone. Today/tonight means end of that day; tomorrow means the next day; end of the week proposes Sunday, end of day. Vague periods such as “next week” remain unresolved. The seller can edit the proposed date and optional promised amount, then confirm or decline. Confirming leaves the invoice due date unchanged. Declining a new proposal does not remove an older confirmed promise. For “paid part, remainder Friday,” review/record the claimed transfer and release its verification hold before confirming the remainder, so the older transfer is not counted toward a new promise.

Only confirmed, unfulfilled promises become missed after the promised date ends. Alerts refresh normally, are checked every 30 seconds and on restart, and are deduplicated. Recorded partial payments can fulfil an explicitly agreed partial promise without settling the whole invoice. A pending payment verification or unclear reply suppresses missed-payment blame until reviewed.

Live Telegram mode uses the business's current calendar date; simulated-date controls are available only in browser-only mode. **Mark message reviewed** and **Mark reviewed** on a receipt do not post a payment or release a payment hold. Use the invoice's **Record verified payment** form for a seller-verified transfer. After a partial transfer, finish the bank review explicitly to release its hold.

The receipt panel labels the **Seller’s receiving account name**, shows the configured expected name beside the recipient name read from each receipt, and explains the result. This is the seller receiving money, not the buyer. `RECEIPT_BENEFICIARY` remains the configuration source; no secrets are exposed to the browser.

- The reply-to Telegram message identifies the invoice first. Without a reply, the service uses that customer's **latest successfully delivered invoice message**, then checks its balance. It does not silently switch to an older unpaid invoice when the latest is paid.
- Matching stays within the configured business and linked customer. Unknown chats and missing invoice mappings are retained as attention records.
- Docling extracts text; Gemma extracts fields. Ollama cloud does not enforce JSON schemas, so the server validates the response and makes the payment decision. Missing fields, ambiguous statements, multiple transactions, wrong beneficiaries/currencies, partial/excess payments, dates outside the invoice-to-today range, disputed/paid invoices, and failed/pending transfers require review.
- Updates, file hashes and transaction references prevent repeated payment posting. Ledger, receipt status and reminder cancellation are committed in one SQLite transaction. Processing is sequential in the polling loop for this low-volume demo. The dashboard refreshes every two seconds.
- Limits: 10 MB, five document pages, 30,000 OCR characters, three minutes for OCR and two minutes for inference. Unsupported, oversized, encrypted or unreadable files require attention.
- Interrupted processing becomes attention work on restart. Unknown Telegram delivery outcomes are not retried automatically, because Telegram's send API cannot guarantee exactly-once delivery. Inspect the chat before preparing another send. An existing webhook is reported without deleting it; use a separate test bot or remove its webhook yourself.

## Storage and checks

The API starts from its own synthetic seed; it does not import or overwrite existing browser localStorage. Authoritative state lives in `.local-data/demo.sqlite`; downloaded receipts also remain under `.local-data/`. This directory, the Python environment, build files and `.env` are ignored by Git. Reset clears receipt records and sent mappings, but files remain on disk. Stop the API before manually removing the local data directory if you want to discard all test artifacts.

Set `VITE_TELEGRAM_ENABLED=false` and restart Vite to return to the original browser-only simulation. The production static preview does not provide this development API proxy.

```powershell
npm run test:logic
npm run test:telegram
npm run build
# Opt-in: actual OCR/cloud inference and an end-of-week reply/attention test; Telegram delivery is mocked.
npm run test:telegram:live
```

This is a trusted, single-user localhost prototype, not an authenticated multi-user service. Keep the frontend bound to loopback; do not publish its API or add a public tunnel. A receipt can be forged: automatic demo settlement does not establish that money reached the seller. Bank reconciliation or explicit seller verification is required before real-money use.
