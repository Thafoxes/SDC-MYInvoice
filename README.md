> **Phase 0 MariaDB update (23 October 2026):** This project supports `DB_CLIENT=mariadb` for the existing XAMPP `nudgewise_db` database. It stores authoritative app state and evidence in MariaDB and refreshes the relational projection tables. See [PHASE_0_MARIADB_CONNECTION.md](PHASE_0_MARIADB_CONNECTION.md) for required XAMPP settings and limits. Legacy SQLite remains available when `DB_CLIENT` is not set.

# NudgeWise — Invoice Follow-Up Assistant

> A seller-controlled invoice follow-up prototype for Malaysian micro and small businesses. NudgeWise tracks outstanding invoices, prepares reminder drafts, records simulated follow-ups, and explains which customer records need attention.

**Current version:** Vue demo v1.1 (Phase 1 reminder safeguards + Phase 2 customer follow-up priorities)  
**Status:** Prototype with customer/order workflows, document uploads, local Docling OCR and configurable Ollama AI. See [setup and test instructions](server/README.md). Real bank verification and production authentication are not implemented.

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

**NudgeWise** focuses on a controlled follow-up workflow: **invoice checkpoint → draft → seller review/approval → revalidation → recorded outcome**. The current build simulates the workflow using local data; optional backend mode adds database persistence, document OCR and AI.

## Implemented Demo Features

- **Receipt account-name explanation:** shows the seller’s expected receiving account name alongside the recipient name read from a receipt.

- **Dashboard:** collected/outstanding/overdue metrics, invoice search and filters, charts, and invoice details.
- **Action Center:** seller reminder approvals, rejections, customer replies, receipt reviews, and activity history.
- **AI Assistant page:** invoice-aware responses through `gemma4:31b` when backend mode is enabled, and local rules otherwise.
- **Reminder safeguards (Phase 1):** due/overdue checkpoints; holds for disputes and unverified payment claims; approval checks; duplicate-checkpoint protection; missed-payment-promise alerts in the demo logic.
- **Customer priorities (Phase 2):** explainable **Red / Yellow / Green / Grey** classification from synthetic invoice/payment history. Customer priority is separate from the urgency of an operational review.
- **Demo controls:** simulated business date, invoice checks, payment recording, customer replies, and reset.
- **Storage:** browser-only mode uses localStorage (`nudgewise-demo-v1.1`); backend mode uses SQLite or MariaDB.

### Not Implemented Yet

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
| Persistence | Browser localStorage (frontend-only), SQLite or MariaDB (backend) |
| Local backend | Node.js 24 built-in HTTP server and SQLite |
| OCR | Python 3.12 + Docling / RapidOCR |
| AI | Ollama cloud API → `gemma4:31b` |
| Messaging | Simulated delivery only |
| Logic tests | TypeScript compiler + Node.js built-in test runner |

**How it runs:** Vue frontend → local Node backend → SQLite/MariaDB and Ollama’s API. Docling OCR runs locally in Python. **You do not need to install or run Ollama on your computer.**

## Local Setup

See [the backend setup guide](server/README.md) for SQLite or MariaDB persistence, document OCR, AI configuration, browser-only mode, troubleshooting and test commands. No messaging bot is required. Customer message delivery is simulated; email delivery is not implemented.

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
│   ├── backend.test.cjs
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
- [x] SQLite/MariaDB backend persistence.
- [ ] Production database and authenticated server-side permissions.
- [x] Seller-approved simulated reminder delivery.
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

See [customer/order walkthrough and setup](docs/customer-order-workflow.md), [project navigation](docs/project-map.md), and the [interactive project map](graphify-out/graph.html). Backend storage and customer OCR run with `VITE_BACKEND_ENABLED=true`. This remains a synthetic-data demo with simulated seller identities.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
