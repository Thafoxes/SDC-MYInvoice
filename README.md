# NudgeWise — Invoice Follow-Up Assistant

> A seller-controlled invoice follow-up prototype for Malaysian micro and small businesses. NudgeWise tracks outstanding invoices, prepares reminder drafts, records simulated follow-ups, and explains which customer records need attention.

**Current version:** Vue demo v1.1 (Phase 1 reminder safeguards + Phase 2 customer follow-up priorities)  
**Status:** Synthetic-data prototype with an optional local Telegram receipt integration: Docling OCR → `gemma4:31b-cloud` → invoice matching → demo settlement or seller attention. See [setup and test instructions](server/README.md). Real bank verification and production authentication are not implemented.

## Team Information

| Field | Details |
| --- | --- |
| Team name | YOLO |
| Hackathon domain | Domain 2 — Orbyte Smart SME Challenge |
| SDG focus | SDG 8 — Decent Work and Economic Growth |
| Team leader | WONG JIA SOON |
| University | To be confirmed by the team |
| Team members | To be confirmed by the team |

## Project Links

| Resource | Link / Status |
| --- | --- |
| Source repository | [Thafoxes/SDC-MYInvoice](https://github.com/Thafoxes/SDC-MYInvoice) |
| Replit project | Not connected yet |
| Live demo | Not deployed yet |
| RunPod inference | Not configured yet |
| Slides and demo video | To be added before submission |

## Problem and Solution

Malaysian small-business sellers may need to compare invoice records, payment updates, and customer messages manually when following up on unpaid invoices. Repeated checks can lead to wasted time or inappropriate reminders if an invoice is already settled, disputed, or awaiting verification.

**NudgeWise** focuses on a controlled follow-up workflow: **invoice checkpoint → draft → seller review/approval → revalidation → recorded outcome**. The current build simulates the workflow using local data; optional Telegram delivery and receipt processing are available in local integration mode.

## Implemented Demo Features

- **Dashboard:** collected/outstanding/overdue metrics, invoice search and filters, charts, and invoice details.
- **Action Center:** simulated reminder approvals, rejections, customer-response exceptions, and activity history.
- **AI Assistant page:** **simulated**, invoice-aware responses; it uses `gemma4:31b-cloud` when Telegram integration mode is enabled, and local rules otherwise.
- **Reminder safeguards (Phase 1):** due/overdue checkpoints; holds for disputes and unverified payment claims; approval checks; duplicate-checkpoint protection; missed-payment-promise alerts in the demo logic.
- **Customer priorities (Phase 2):** explainable **Red / Yellow / Green / Grey** classification from synthetic invoice/payment history. Customer priority is separate from the urgency of an operational review.
- **Demo controls:** simulated business date, invoice checks, payment recording, customer replies, and reset.
- **Storage:** browser-only mode uses localStorage (`nudgewise-demo-v1.1`); Telegram mode uses a separate local SQLite store shared by the bot and dashboard.

### Not Implemented Yet

- Production Telegram webhooks, customer onboarding and seller authentication. Local polling and manual test-chat linking are implemented.
- RunPod deployment. Local Ollama with Gemma 4 cloud and receipt-output validation are implemented in optional integration mode.
- Production database and server-side user authentication. The local service uses SQLite and existing demo role rules.
- Live Orbyte platform integration, real payment verification, and production-grade delivery handling.

**Do not use this prototype with real customer details, credentials, or financial records.** The demo is not a payment-processing service or statutory e-invoice submission system.

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
| Demo persistence | Browser localStorage |
| Logic tests | TypeScript compiler + Node.js built-in test runner |

**Planned architecture (not yet deployed):** Vue frontend → Replit-hosted backend + persistent SQL database → Telegram API for messaging and Ollama (local / RunPod) for AI tasks. The backend will enforce authentication, permissions, approvals, and idempotent sending.

## Quick Start — Run Locally

### Prerequisites

- **Node.js 20 or newer** (the project has been started successfully with Node.js 20.20.2 and npm 10.8.2).
- **npm** (installed with Node.js).
- Git (if cloning the repository).

Check your installations:

```bash
node -v
npm -v
git --version
```

### Option A — Clone from GitHub (new teammate)

```bash
git clone https://github.com/Thafoxes/SDC-MYInvoice.git
cd SDC-MYInvoice
npm install
npm run dev
```

Open the **Local** URL displayed by Vite, usually **http://localhost:5173/**.

> The GitHub repository must contain the project files and latest commit before teammates can clone this application. The application is currently developed in `~/nudgewise` / `~/SDC-MYInvoice` on the original development machine.

### Option B — Run an existing local checkout (Ubuntu)

```bash
cd ~/SDC-MYInvoice
npm install
npm run dev
```

To stop the dev server, press **Ctrl+C**. To restart later, run `npm run dev` from the project folder.

### Windows (PowerShell)

```powershell
git clone https://github.com/Thafoxes/SDC-MYInvoice.git
cd SDC-MYInvoice
npm install
npm run dev
```

### Available npm Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite's development server |
| `npm run typecheck` | Check Vue and TypeScript types |
| `npm run build` | Type-check, then build the app into `dist/` |
| `npm run preview` | Serve the compiled build for local preview |
| `npm run test:logic` | Run the framework-independent business-logic regression tests |

Recommended checks after setup:

```bash
npm run test:logic
npm run build
```

The logic tests use a temporary **`.test-build/`** directory and cover the local business rules; they do **not** validate Telegram delivery, browser rendering, or external API integrations.

### Common Setup Problems

- **`npm: command not found`**: install a supported Node.js release that includes npm.
- **Port 5173 already in use**: Vite may choose another port. Open the address shown in the terminal.
- **`npm install` reports vulnerabilities**: inspect them using `npm audit`; avoid automatically using `npm audit fix --force`, which can introduce breaking upgrades.
- **`npm install` warns about `lucide-vue-next` deprecation**: it is an existing dependency; migration can be handled separately.
- **Demo changes disappear after browser-data clearing**: the app stores demo state in localStorage; use Demo Controls → Reset to restore the shipped scenarios.

## Project Structure

```text
SDC-MYInvoice/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
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
│   ├── composables/useDemoStore.ts
│   └── lib/
│       ├── data.ts               # synthetic seed data
│       ├── store.ts              # local demo state
│       ├── actions.ts            # invoice/reminder actions
│       ├── reminderEngine.ts     # checkpoint and hold rules
│       ├── priorityEngine.ts     # customer follow-up priorities
│       ├── aiService.ts          # simulated assistant
│       └── format.ts
├── tests/
│   ├── logic.test.cjs
│   └── setup-test-build.cjs
├── PHASE_1_2_CHANGELOG.md
├── tech_stack.md
├── LICENSE
└── README.md
```

The project may also include other repository metadata such as `.codex/` and `.gitignore`. Do not commit `node_modules/`, `dist/`, `.test-build/`, or `.env` files.

## Running on Replit — Planned

Replit is a target development/deployment environment, **not yet verified as a running deployment for this version**.

1. Import the GitHub repository into a Replit project.
2. Ensure Replit provides a compatible Node.js/npm environment.
3. Run `npm install`, then `npm run dev` (or configure the project's run command accordingly).
4. Open the web preview on the port Vite exposes. The Vite dev server is configured to bind to `0.0.0.0`.
5. Test the app in Replit before claiming deployment or adding submission proof.

**No Replit/Telegram/RunPod API keys are needed to run the current local demo.** Any future API credentials must be stored securely in Replit Secrets or server-side environment variables, never in browser code or Git.

## RunPod and Ollama — Planned

The future AI integration will use **Gemma 4** through Ollama for reminder drafting, customer-response classification, and summarizing verified evidence. The expected arrangement is:

```text
Vue seller dashboard
        ↓
Application backend (planned on Replit)
        ├── SQL database and invoice rules
        ├── Telegram approval / messaging (planned)
        └── Authenticated Ollama endpoint (local for local testing,
            RunPod GPU Pod for hosted inference)
```

RunPod is **not connected in this version**. A deployed Replit backend cannot access an Ollama service running on a developer's laptop via `localhost`. The hosted endpoint will need a secure network connection and appropriate authentication.

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
- [ ] Persistent SQL backend and server-side permissions.
- [ ] Telegram seller approvals and opted-in customer messaging.
- [ ] Gemma 4 / Ollama integration, local and hosted inference tests, and fallback verification.
- [ ] Simulated Orbyte connector interface and second-business isolation demonstration.
- [ ] Replit and RunPod proof of use, if required by the submission rules.
- [ ] Slides, demo video, and final submission documents.
- [ ] Verify documentation and GitHub repository are up to date.

See [`PHASE_1_2_CHANGELOG.md`](PHASE_1_2_CHANGELOG.md) for the implementation notes. For the full requirements and acceptance criteria, refer to the team's NudgeWise v1.1 requirements document.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
