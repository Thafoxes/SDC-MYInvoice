# NudgeWise — Invoice Follow-Up Assistant

> A seller-controlled invoice follow-up prototype for Malaysian micro and small businesses. NudgeWise tracks outstanding invoices, prepares reminder drafts, records simulated follow-ups, and explains which customer records need attention.

**Current version:** Vue demo v1.1 (Phase 1 reminder safeguards + Phase 2 customer follow-up priorities)  
**Status:** Synthetic-data prototype with an optional local Telegram receipt integration: Docling OCR → `gemma4:31b` → invoice matching → demo settlement or seller attention. See [setup and test instructions](server/README.md). Real bank verification and production authentication are not implemented.

## Team Information

| Field                  | Details                                     |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | YOLO                                        |
| **Team Domain**        | Domain 2                                    |
| **SDG Track (1–17)**   | SDG 8 — Decent Work and Economic Growth |
| **Team Leader**        | WONG JIA SOON                               |
| **University**         | UNIVERSITI TEKNOLOGI MALAYSIA                |
| **Number of Members**  | 4                                      |

## Project Links

| Resource | Link / Status |
| --- | --- |
| Source repository | [Thafoxes/SDC-MYInvoice](https://github.com/Thafoxes/SDC-MYInvoice) |
| Replit project | Not connected yet |
| Live demo | Not deployed yet |
| RunPod inference | Not configured yet |
| Slides and demo video | https://canva.link/jg055mv4dvbzpgc |

## Problem and Solution

Malaysian small-business sellers may need to compare invoice records, payment updates, and customer messages manually when following up on unpaid invoices. Repeated checks can lead to wasted time or inappropriate reminders if an invoice is already settled, disputed, or awaiting verification.

**NudgeWise** focuses on a controlled follow-up workflow: **invoice checkpoint → draft → seller review/approval → revalidation → recorded outcome**. The current build simulates the workflow using local data; optional Telegram delivery and receipt processing are available in local integration mode.

## Implemented Demo Features

- **Telegram customer replies (optional local mode):** Gemma classifies payment claims, promises, extension and payment-method requests. Sellers confirm dates; Dashboard and Action Center share missed-promise and verification alerts across all invoices.
- **Receipt account-name explanation:** shows the seller’s expected receiving account name alongside the recipient name read from a receipt.

- **Dashboard:** collected/outstanding/overdue metrics, invoice search and filters, charts, and invoice details.
- **Action Center:** seller reminder approvals, rejections, customer replies, receipt reviews, and activity history.
- **AI Assistant page:** invoice-aware responses through `gemma4:31b` when Telegram integration mode is enabled, and local rules otherwise.
- **Reminder safeguards (Phase 1):** due/overdue checkpoints; holds for disputes and unverified payment claims; approval checks; duplicate-checkpoint protection; missed-payment-promise alerts in the demo logic.
- **Customer priorities (Phase 2):** explainable **Red / Yellow / Green / Grey** classification from synthetic invoice/payment history. Customer priority is separate from the urgency of an operational review.
- **Demo controls:** simulated business date, invoice checks, payment recording, customer replies, and reset.
- **Storage:** browser-only mode uses localStorage (`nudgewise-demo-v1.1`); Telegram mode uses a separate local SQLite store shared by the bot and dashboard.

### Not Implemented Yet

- Production Telegram webhooks, customer onboarding and seller authentication. Local polling and manual test-chat linking are implemented.
- RunPod deployment. Direct Ollama API with Gemma 4 cloud and receipt-output validation are implemented in optional integration mode.
- Production database and server-side user authentication. The local service uses SQLite and existing demo role rules.
- Live Orbyte platform integration, real payment verification, and production-grade delivery handling.

**Use synthetic customer details and financial records.** Keep test-bot credentials in `.env`. The demo is not a payment-processing service or statutory e-invoice submission system.

## Tech Stack (Current)

| Layer | Technology |
| --- | --- |
| Frontend | Vue 3 + TypeScript |
| Build / development | Vite 5 |
| Navigation | Vue Router |
| Styling | Tailwind CSS |
| Charts | Chart.js + vue-chartjs |
| Icons | lucide-vue-next (current demo dependency) |
| Application logic | TypeScript modules in `src/lib/` |
| Persistence | Browser localStorage (frontend-only) or SQLite (Telegram mode) |
| Local backend | Node.js 24 built-in HTTP server and SQLite |
| OCR | Python 3.12 + Docling / RapidOCR |
| AI | Ollama cloud API → `gemma4:31b` |
| Messaging | Telegram Bot API with long polling |
| Logic tests | TypeScript compiler + Node.js built-in test runner |

**How it runs:** Vue frontend → local Node backend → Telegram, SQLite and Ollama’s cloud API. Docling OCR runs locally in Python. **You do not need to install or run Ollama on your computer.**

## Local Setup

### 1. Install dependencies (once)

You need **Node.js 24+**, **Python 3.12**, a Telegram test bot token from [BotFather](https://t.me/BotFather), and an [Ollama API key](https://ollama.com/settings/keys).

Open PowerShell in the project folder:

```powershell
cd D:\Github\SDC-test
npm install
py -3.12 -m venv .venv-telegram
.venv-telegram/Scripts/python.exe -m pip install -r server/requirements.txt
```

If `.venv-telegram` is already set up, reuse it. On macOS/Linux, use `python3.12 -m venv .venv-telegram` and `.venv-telegram/bin/python -m pip install -r server/requirements.txt` instead.

### 2. Add your keys to `.env`

Create the file if it does not exist:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Open `.env` and fill in these settings. Keep your existing Telegram token if it is already there:

```dotenv
VITE_TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OLLAMA_API_KEY=your_ollama_api_key
OLLAMA_MODEL=gemma4:31b
DOCLING_PYTHON=.venv-telegram/Scripts/python.exe
RECEIPT_BENEFICIARY=Kedai Maju Jaya Sdn Bhd
```

- `OLLAMA_API_KEY`: your private key. The backend sends requests to `https://ollama.com/api/chat`.
- `OLLAMA_MODEL`: use `gemma4:31b` for the direct API. This is the Gemma 4 31B cloud model; do not use the local client's `-cloud` suffix here.
- `DOCLING_PYTHON`: the OCR environment’s Python executable. On macOS/Linux, use `.venv-telegram/bin/python`.
- `RECEIPT_BENEFICIARY`: **your receiving bank account name as the seller**, not the buyer’s name. A different name on the receipt requires human review.

Never commit `.env` or put API keys in `VITE_` variables. The backend reads the keys; the browser does not receive them. Internet access is required for Telegram and Ollama cloud. See [Ollama API documentation](https://docs.ollama.com/cloud).

### 3. Start the backend — Terminal 1

```powershell
cd D:\Github\SDC-test
npm run server
```

Leave this terminal open. It should show:

```text
Local Telegram demo API: http://127.0.0.1:8787
```

The backend handles Telegram, OCR, invoice updates and Ollama API requests. The first receipt can take longer while OCR models initialize or download.

### 4. Start the frontend — Terminal 2

```powershell
cd D:\Github\SDC-test
npm run dev -- --host 127.0.0.1 --strictPort
```

Open [Dashboard](http://127.0.0.1:5173/#/dashboard) or [Action Center](http://127.0.0.1:5173/#/action-center). Keep both terminals open.

**Next time:** you only need the two startup commands above. No `ollama serve`, model download or local Ollama sign-in is needed.

### 5. Connect Telegram and try it

1. Send `/start` in a private chat with your bot. It replies with your chat ID.
2. In **Action Center → Link a test customer**, select the customer whose invoice you are testing and enter that ID. One chat can belong to only one customer.
3. Approve that customer’s invoice reminder, then click **Send to Telegram**. Use **Demo Controls → Run Invoice Check** to prepare eligible reminders if needed.
4. Reply to the invoice message with a synthetic PDF/image receipt or a message such as “I will pay by the end of the week.”
5. Check **Customer Responses** and **Needs your attention**. Sellers confirm proposed dates and review payment claims. An exact receipt match can settle a synthetic invoice automatically.

The buyer’s chat must be explicitly linked; seeded chat IDs are sample values. For detailed matching rules, receipt fixtures and review actions, see [the integration guide](server/README.md).

### Stop or restart

Press **Ctrl+C** in the relevant terminal. After editing `.env`, stop and restart the backend. If you changed `VITE_TELEGRAM_ENABLED`, restart the frontend too. If an agent started the backend, ask it to stop or restart that process before starting a second copy.

### Common problems

| Problem | Fix |
| --- | --- |
| Local API unavailable | Start `npm run server` in Terminal 1. |
| Missing Ollama key / access denied | Set a valid `OLLAMA_API_KEY` in `.env` and restart the backend. |
| Ollama API request fails | Check internet access, account limits and `OLLAMA_MODEL=gemma4:31b`. |
| Bot does not reply | Check `TELEGRAM_BOT_TOKEN`, restart the backend, and check polling errors in Action Center. Use a test bot without a webhook. |
| Seeded chat ID / chat already linked | Link the correct customer. If your ID is already linked to Ahmad, test Ahmad’s invoice. |
| Recipient name differs | Check the receipt recipient against `RECEIPT_BENEFICIARY`. It is the seller’s account name. |
| OCR fails | Check Python 3.12 and `DOCLING_PYTHON`; install `server/requirements.txt` in that environment. |
| Port already in use | Stop the existing frontend/backend in its terminal, or ask the agent that started it. |

### Optional: frontend only

Set `VITE_TELEGRAM_ENABLED=false` in `.env`, then run only the frontend command. This mode uses browser storage and simulated AI; Telegram mode uses separate SQLite data in `.local-data/`.

### Checks

```powershell
npm run test:logic
npm run test:telegram
npm run build
```

Optional: `npm run test:telegram:live` uses real OCR and your Ollama API key with synthetic fixtures. It mocks Telegram delivery, so no messages are sent.

Keep this prototype on localhost and use synthetic financial records. AI and receipts cannot verify that bank funds arrived.

## Project Structure

```text
SDC-MYInvoice/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.server.json
├── server/                     # local API, Docling worker and integration guide
├── .env.example                # settings template; real .env stays private
├── tsconfig.logic-tests.json
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── index.css
│   ├── router/index.ts
│   ├── views/
│   │   ├── DashboardView.vue
│   │   ├── ActionCenterView.vue
│   │   └── AiAssistantView.vue
│   ├── components/
│   │   ├── AppSidebar.vue
│   │   ├── AppHeader.vue
│   │   ├── InvoiceDetailDrawer.vue
│   │   ├── DemoControls.vue
│   │   ├── StatusBadge.vue
│   │   └── BaseModal.vue
│   ├── services/commands.ts    # browser-to-backend commands
│   ├── composables/useDemoStore.ts
│   └── lib/
│       ├── data.ts               # data access compatibility
│       ├── store.ts              # synthetic seed and persistence adapter
│       ├── receipts.ts           # invoice/receipt matching
│       ├── replyAnalysis.ts      # validated reply fields and date resolution
│       ├── attention.ts          # shared dashboard/review queue
│       ├── actions.ts            # invoice/reminder actions
│       ├── reminderEngine.ts     # checkpoint and hold rules
│       ├── priorityEngine.ts     # customer follow-up priorities
│       ├── aiService.ts          # simulated assistant
│       └── format.ts
├── tests/
│   ├── telegram.test.cjs
│   ├── telegram-live.cjs
│   ├── fixtures/
│   ├── logic.test.cjs
│   └── setup-test-build.cjs
├── PHASE_1_2_CHANGELOG.md
├── tech_stack.md
├── LICENSE
└── README.md
```

The project may also include other repository metadata such as `.codex/` and `.gitignore`. Do not commit `node_modules/`, `dist/`, `.test-build/`, `.server-build/`, `.local-data/`, `.venv-telegram/`, or `.env` files.

## Development and Contribution

For a shared repository, pull your team's latest changes before starting work. Prefer a feature branch and pull request rather than having everyone push directly to `main`:

```bash
cd ~/SDC-MYInvoice
git pull --ff-only origin main
git switch -c feature/your-change
# edit and test your code
npm run test:logic
npm run build
git add .
git commit -m "Describe your change"
git push -u origin feature/your-change
```

Before staging or pushing, check that no `.env`, credentials, personal data, or build artifacts are included.

## Hackathon Progress and Submission

- [x] Vue demo dashboard, invoice views, and local activity history.
- [x] Local demo clock, reset, and simulated payments.
- [x] Phase 1 reminder/approval safeguards implemented in demo logic.
- [x] Phase 2 rule-based customer priority classification implemented.
- [ ] Full browser regression and complete v1.1 acceptance testing.
- [x] Local SQLite backend for Telegram integration.
- [ ] Production database and authenticated server-side permissions.
- [x] Local seller-approved Telegram delivery and manually linked test chats.
- [ ] Production customer onboarding and delivery handling.
- [x] Direct Ollama cloud API with Gemma 4, receipt OCR, customer-reply classification and synthetic integration tests.
- [ ] Hosted inference and production acceptance testing.
- [ ] Simulated Orbyte connector interface and second-business isolation demonstration.
- [ ] Replit and RunPod proof of use, if required by the submission rules.
- [ ] Slides, demo video, and final submission documents.
- [ ] Verify documentation and GitHub repository are up to date.

See [`PHASE_1_2_CHANGELOG.md`](PHASE_1_2_CHANGELOG.md) for the implementation notes. For the full requirements and acceptance criteria, refer to the team's NudgeWise v1.1 requirements document.

## Customer and order workflow

The workspace starts without sample transactions. Customers can be found by phone, added manually or from reviewed OCR suggestions, and checked before accepting a buyer PO. Purchase orders support editable header/contact/delivery fields and line items, with original PNG/JPG/PDF evidence retained in SQLite. Previous disputed invoices place new orders on hold until resolved and settled; the seller can record a reasoned exception for one PO.

See [customer/order walkthrough and setup](docs/customer-order-workflow.md), [project navigation](docs/project-map.md), and the [interactive project map](graphify-out/graph.html). Backend storage and customer OCR can run independently of Telegram with `VITE_BACKEND_ENABLED=true`. This remains a synthetic-data demo with simulated seller identities.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
