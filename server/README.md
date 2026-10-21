# Local Telegram receipt test

This optional mode connects the Vue demo to a loopback Node API, SQLite, Telegram long polling, Docling OCR and **`gemma4:31b-cloud`** through Ollama. The AI Assistant also uses this model when enabled. Use synthetic receipts and a dedicated test bot.

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
   - `OLLAMA_MODEL=gemma4:31b-cloud`
   - `OLLAMA_HOST=http://localhost:11434`
   - `DOCLING_PYTHON` to the OCR environment's Python executable.
   - `RECEIPT_BENEFICIARY` to the exact account name on your synthetic receipt. Missing or mismatched names require review.

   Never prefix secrets with `VITE_`; those variables are public browser configuration. The supported UI business is the seeded `biz-001`.

4. Start Ollama if it is not already running (`ollama serve`). Sign into cloud models in the Ollama app/CLI, then register the model:

   ```powershell
   ollama pull gemma4:31b-cloud
   ```

   The cloud model uses the internet and sends submitted text to Ollama's cloud, even though your app calls localhost.

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

For the committed fixtures in `tests/fixtures`, temporarily set `RECEIPT_BENEFICIARY=Test Seller` and restart the API. They contain a synthetic RM1,800 transfer dated 2026-10-20, reference `TEST-TRANSFER-1`. Test each fixture with fresh demo data; reusing either receipt must not record another payment. Resetting clears chat links, so link again afterwards.

## Matching and failure handling

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
# Opt-in: actual OCR and cloud inference; uses synthetic fixtures and mocks Telegram delivery.
npm run test:telegram:live
```

This is a trusted, single-user localhost prototype, not an authenticated multi-user service. Keep the frontend bound to loopback; do not publish its API or add a public tunnel. A receipt can be forged: automatic demo settlement does not establish that money reached the seller. Bank reconciliation or explicit seller verification is required before real-money use.
