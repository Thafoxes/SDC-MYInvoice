# Graph Report - SDC-test  (2026-10-23)

## Corpus Check
- Corpus is ~48,416 words - fits in a single context window. You may not need a graph.

## Summary
- 873 nodes · 1947 edges · 55 communities (49 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Invoice actions and safeguards
- Planned email workflow
- Build and runtime dependencies
- Invoice browsing
- Order intake and approval
- Reminder tone editing
- Build and runtime dependencies
- Demo simulation controls
- Build and runtime dependencies
- Action Center approvals
- Collection dashboard
- Project setup and scope
- Phone lookup and onboarding
- Application shell
- Customer history
- OCR and AI integrations
- Invoice review and payments
- Shared business records
- Frontend compiler settings
- Seller progress
- Legacy Telegram receipts
- Package and runtime settings
- Development commands
- Buyer reply review
- Build and runtime dependencies
- Assistant conversation
- Customer order API tests
- Navigation and notifications
- Payment feedback
- Demo passcode screen
- Action Center approvals
- Build and runtime dependencies
- Customer payment priorities
- Build and runtime dependencies
- Replit deployment notes
- Build tool dependencies
- Test compiler settings
- Build and runtime dependencies
- Test compiler settings
- Build and runtime dependencies
- HTTP and SQLite backend
- State and invoice actions
- Browser backend commands
- Legacy integration setup
- Shared attention queue
- Collection dashboard
- Frontend dependencies
- Reminder safeguard history
- Demo access guard
- Build and runtime dependencies
- Server compiler settings
- Frontend HTTP serving
- Python environment

## God Nodes (most connected - your core abstractions)
1. `getStore()` - 34 edges
2. `computeInvoiceWithCustomer()` - 33 edges
3. `sumMoney()` - 28 edges
4. `refreshStore()` - 26 edges
5. `vue` - 24 edges
6. `update()` - 23 edges
7. `createBackend()` - 22 edges
8. `addActivity()` - 22 edges
9. `useDemoStore()` - 20 edges
10. `DEMO_BUSINESS_ID` - 20 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/customer-orders-server.test.cjs → server/app.cjs
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/purchase-order.test.cjs → server/app.cjs
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/rewrite.test.cjs → server/app.cjs
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/telegram.test.cjs → server/app.cjs
- `onStorage()` --calls--> `refreshStore()`  [EXTRACTED]
  src/App.vue → src/composables/useDemoStore.ts

## Import Cycles
- None detected.

## Communities (55 total, 6 thin omitted)

### Community 0 - "Invoice actions and safeguards"
Cohesion: 0.07
Nodes (83): items, actionForBusiness(), ActionResult, actorForBusiness(), applyCustomerReply(), approveFollowUp(), balanceForInvoice(), cancelAction() (+75 more)

### Community 1 - "Planned email workflow"
Cohesion: 0.07
Nodes (22): Business rules to implement, Current project and reuse, How documents enter the system, Main seller flow, Minimum data additions, Minimum system contents, Not in this proof of concept, NudgeWise email proof-of-concept plan (+14 more)

### Community 2 - "Build and runtime dependencies"
Cohesion: 0.09
Nodes (12): Phase 3: Add business requirements and payment blockers, Phase 5: Verify the end-to-end proof of concept, typescript, mem, root, mem, root, display (+4 more)

### Community 3 - "Invoice browsing"
Cohesion: 0.08
Nodes (26): CustomerPriority, DerivedLabel, formatShortPriorityReason(), getDerivedLabelChips(), getDerivedLabels(), plural(), Invoice, InvoiceWithCustomer (+18 more)

### Community 4 - "Order intake and approval"
Cohesion: 0.08
Nodes (26): getOrderEligibility(), approvePurchaseOrder, createPurchaseOrder, updatePurchaseOrder, intakeEligibility, activeOrder, activeOrderId, actor (+18 more)

### Community 5 - "Reminder tone editing"
Cohesion: 0.13
Nodes (23): emit, finish(), generate(), lang, loading, preview, props, remember (+15 more)

### Community 7 - "Demo simulation controls"
Cohesion: 0.11
Nodes (24): advanceDate(), {data,refreshStore}, expanded, notice, paymentAmount, paymentDate, paymentInvoice, paymentMethod (+16 more)

### Community 8 - "Build and runtime dependencies"
Cohesion: 0.09
Nodes (23): baseline, details, dirty, disabled, emit, error, evidenceUrl, groups (+15 more)

### Community 9 - "Action Center approvals"
Cohesion: 0.08
Nodes (23): AttentionItem, activity, custMap, {data,refreshStore}, drawerOpen, editError, editId, editText (+15 more)

### Community 10 - "Collection dashboard"
Cohesion: 0.09
Nodes (23): bizId, chartOptions, collected, currentBusiness, currentUser, { data }, exceptions, invoices (+15 more)

### Community 11 - "Project setup and scope"
Cohesion: 0.09
Nodes (22): 1. Install dependencies (once), 2. Add your keys to `.env`, 3. Start the backend — Terminal 1, 4. Start the frontend — Terminal 2, 5. Connect Telegram and try it, Checks, Common problems, Customer and order workflow (+14 more)

### Community 12 - "Phone lookup and onboarding"
Cohesion: 0.11
Nodes (22): busy, choose(), { data, refreshStore }, emit, error, extracted, form, matches (+14 more)

### Community 13 - "Application shell"
Cohesion: 0.12
Nodes (16): vue, vue-router, {data,refreshStore}, mainContent, notifications, onStorage(), seller, business (+8 more)

### Community 14 - "Customer history"
Cohesion: 0.09
Nodes (18): currentBusiness, currentUser, { data, refreshStore }, drawerOpen, expandedPriority, intakeCustomer, intakeCustomerId, langNotice (+10 more)

### Community 15 - "OCR and AI integrations"
Cohesion: 0.16
Nodes (14): Phase 4: Send and receive email, chat(), classifyReply(), download(), extract(), extractCustomer(), extractPurchaseOrder(), readDocument() (+6 more)

### Community 16 - "Invoice review and payments"
Cohesion: 0.13
Nodes (20): activity, amount, confirmPromiseAction(), {data,refreshStore}, date, emit, error, followups (+12 more)

### Community 17 - "Shared business records"
Cohesion: 0.15
Nodes (19): Receipt, StoreData, ActivityEvent, AiConversation, ApprovalState, Business, CustomerResponse, CustomerResponseWithInvoice (+11 more)

### Community 18 - "Frontend compiler settings"
Cohesion: 0.12
Nodes (15): @vue/tsconfig/tsconfig.dom.json, compilerOptions, baseUrl, module, moduleResolution, noUnusedLocals, noUnusedParameters, paths (+7 more)

### Community 19 - "Seller progress"
Cohesion: 0.13
Nodes (14): collected, dash, { data }, draft, editing, goal, input, monthName (+6 more)

### Community 20 - "Legacy Telegram receipts"
Cohesion: 0.15
Nodes (12): Phase 1: Replace Telegram coupling with email-ready backend access, busy, chatId, customerId, customers, { data }, notice, receipts (+4 more)

### Community 21 - "Package and runtime settings"
Cohesion: 0.13
Nodes (14): engines, node, name, private, type, version, autoprefixer, chart.js (+6 more)

### Community 22 - "Development commands"
Cohesion: 0.14
Nodes (14): scripts, build, dev, preview, server, server:build, start, test:customers (+6 more)

### Community 23 - "Buyer reply review"
Cohesion: 0.16
Nodes (13): act(), amount, busy, date, decide(), emit, flags, notice (+5 more)

### Community 24 - "Build and runtime dependencies"
Cohesion: 0.22
Nodes (12): total, CustomerExtraction, CustomerInput, Result, emptyPurchaseOrderDetails(), purchaseOrderLineTotal(), purchaseOrderTotal(), validatePurchaseOrderDetails() (+4 more)

### Community 25 - "Assistant conversation"
Cohesion: 0.20
Nodes (13): addAiMessage, askAiAssistant, clearAiConversation, clear(), {data,refreshStore}, input, loading, messages (+5 more)

### Community 27 - "Navigation and notifications"
Cohesion: 0.18
Nodes (11): formattedDate, openNotification(), props, {refreshStore}, route, router, showNotifs, showProfile (+3 more)

### Community 28 - "Payment feedback"
Cohesion: 0.18
Nodes (11): arm(), confetti, { data }, known, paid, pieces, props, stopArmWatch (+3 more)

### Community 29 - "Demo passcode screen"
Cohesion: 0.18
Nodes (7): AccessState, authenticated, message, passcode, state, submitting, backendEnabled

### Community 30 - "Action Center approvals"
Cohesion: 0.27
Nodes (11): savePayment(), savePayment(), refreshStore(), editFollowUpMessage, recordPayment, setCustomerLanguage, applyStudio(), execute() (+3 more)

### Community 31 - "Build and runtime dependencies"
Cohesion: 0.24
Nodes (10): saved, saveEdit(), estimateTimeSaved(), formatDuration(), goalKey(), invoicesTrackedThisMonth(), loadGoal(), MANUAL_MINUTES (+2 more)

### Community 32 - "Customer payment priorities"
Cohesion: 0.20
Nodes (10): calculateCustomerPriorities(), PriorityLevel, SettledEvidence, settlementDate(), Credit, Customer, Payment, priorityRecords (+2 more)

### Community 33 - "Build and runtime dependencies"
Cohesion: 0.20
Nodes (9): Customer lookup and purchase-order approval, Empty workspace and recovery, Find or add a customer, Full PO entry and original evidence, Order hold, Run and verify, Seller override, Try the demo (+1 more)

### Community 34 - "Replit deployment notes"
Cohesion: 0.20
Nodes (7): NudgeWise on Replit, Publishing configuration (not yet published), Run, Scope and constraints, Secrets and origins, SQLite persistence: important, Verification

### Community 35 - "Build tool dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, typescript, vite, @vitejs/plugin-vue (+2 more)

### Community 36 - "Test compiler settings"
Cohesion: 0.20
Nodes (5): Project Structure, vite, @vitejs/plugin-vue, exclude, include

### Community 37 - "Build and runtime dependencies"
Cohesion: 0.20
Nodes (10): invoices, current, week, computeInvoiceWithCustomer(), startOfWeek(), weeklyWins, invoices, invoices (+2 more)

### Community 38 - "Test compiler settings"
Cohesion: 0.20
Nodes (10): compilerOptions, baseUrl, module, moduleResolution, noEmitOnError, outDir, paths, skipLibCheck (+2 more)

### Community 40 - "HTTP and SQLite backend"
Cohesion: 0.44
Nodes (9): createBackend(), attention(), monitor(), poll(), receive(), receiveReply(), sendApproved(), transaction() (+1 more)

### Community 41 - "State and invoice actions"
Cohesion: 0.47
Nodes (7): getDemoState(), getSeedData(), load(), migrate(), readStored(), resetStore(), save()

### Community 42 - "Browser backend commands"
Cohesion: 0.31
Nodes (7): replaceSnapshot(), approveFollowUp, checkAccess(), command(), refreshServer(), rejectFollowUp, sendApprovedFollowUp

### Community 43 - "Legacy integration setup"
Cohesion: 0.25
Nodes (7): Customer replies and promised payments, Local Telegram receipt test, Matching and failure handling, Opt-in: actual OCR/cloud inference and an end-of-week reply/attention test; Telegram delivery is mocked., Setup, Storage and checks, Try the complete flow

### Community 44 - "Shared attention queue"
Cohesion: 0.25
Nodes (6): { data }, emit, expanded, props, visible, DEMO_BUSINESS_ID

### Community 45 - "Collection dashboard"
Cohesion: 0.29
Nodes (7): sumMoney(), outstandingFor(), aging, outstandingTotal, overdueTotal, paymentsLast30, totals

### Community 46 - "Frontend dependencies"
Cohesion: 0.33
Nodes (6): dependencies, chart.js, lucide-vue-next, vue, vue-chartjs, vue-router

### Community 47 - "Reminder safeguard history"
Cohesion: 0.33
Nodes (5): NudgeWise — Phase 1 + 2 Changes, Phase 1, Phase 2, User upgrade note, Verification

### Community 48 - "Demo access guard"
Cohesion: 0.53
Nodes (4): createAccessGuard(), authenticated(), digest(), equal()

### Community 49 - "Build and runtime dependencies"
Cohesion: 0.40
Nodes (3): lucide-vue-next, emit, telegramEnabled

### Community 50 - "Server compiler settings"
Cohesion: 0.40
Nodes (4): ./tsconfig.logic-tests.json, compilerOptions, outDir, extends

### Community 51 - "Frontend HTTP serving"
Cohesion: 0.50
Nodes (3): root, serveFrontend(), types

## Knowledge Gaps
- **383 isolated node(s):** `name`, `private`, `version`, `type`, `start` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 453 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where to make changes` connect `Build and runtime dependencies` to `Order intake and approval`, `Build and runtime dependencies`, `Build and runtime dependencies`, `State and invoice actions`, `Browser backend commands`, `Phone lookup and onboarding`, `OCR and AI integrations`, `Build and runtime dependencies`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _383 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Invoice actions and safeguards` be split into smaller, more focused modules?**
  _Cohesion score 0.06872852233676977 - nodes in this community are weakly interconnected._
- **Why does `Current project and reuse` connect `Planned email workflow` to `Invoice actions and safeguards`, `Build and runtime dependencies`, `Browser backend commands`, `Application shell`, `OCR and AI integrations`, `Demo access guard`, `Shared business records`, `Legacy Telegram receipts`, `Package and runtime settings`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `Planned email workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.06653225806451613 - nodes in this community are weakly interconnected._
- **Why does `createBackend()` connect `HTTP and SQLite backend` to `Demo access guard`, `Frontend HTTP serving`, `OCR and AI integrations`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `Build and runtime dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._
## Scope and interpretation

- Code relationships come from Graphify's deterministic AST extraction. Document nodes represent headings and literal source-path references; they are a navigation index, not a claim of complete semantic understanding.
- `docs/email-mvp-plan.md` describes proposed work. A document referencing a source file does not mean that proposal is implemented. Existing Telegram integration remains separately visible.
- Secrets, environment files, runtime customer databases, dependencies, builds, datasets, RunPod assets, submission material and binary fixtures/PDFs are excluded. Source CSS, lockfiles and other unsupported formats may not have nodes.
- Vue template interactions, dynamic dispatch and runtime effects may be absent or approximate. Verify critical behavior in source and tests.
- Host review used inline document inspection because agent slots were occupied. No external LLM extraction was used; extraction token counters are zero, and host-session token usage is unavailable rather than measured as zero.
- `graphify-out/` was written into the working tree. Commit only the outputs the team wants to share; generated caches and machine-specific interpreter paths need not be committed.

## Extraction health

```text
[graphify] MultiDiGraph edge-collapse diagnostic
input: <in-memory>
input_stage: provided JSON (normal graph.json is post-build)
effective_directed: <direct-call>
nodes: 833
unverified_code_nodes: 0
raw_edges: 2026
valid_candidate_edges: 1918
missing_endpoint_edges: 0
dangling_endpoint_edges: 46
external_reference_edges: 62
self_loop_edges: 1
exact_duplicate_edges: 0
directed_unique_endpoint_pairs: 1841
directed_same_endpoint_collapsed_edges: 77
undirected_unique_endpoint_pairs: 1840
undirected_same_endpoint_collapsed_edges: 78
same_endpoint_group_count: 75
relation_variant_groups: 56
source_file_variant_groups: 0
source_location_variant_groups: 19
context_variant_groups: 0
post_build_graph_type: DiGraph
post_build_edges: 1947
producer_suppression_sites: 12
producer_suppression_examples:
  - L1813 seen_ids arity=unknown
  - L2377 seen_ids arity=unknown
  - L2379 seen_doc_refs arity=unknown
  - L3046 seen_ids arity=unknown
  - L3193 seen_ids arity=unknown
  - L4222 seen_keys arity=unknown
  - L4408 seen_keys arity=unknown
  - L7689 seen_ids arity=unknown
examples:
  - src_components_invoicedetaildrawer -> src_services_commands edges=3 relations=['imports_from'] locations=['L12', 'L13', 'L7'] contexts=['import']
  - docs_email_mvp_plan_current_project_and_reuse -> server_app edges=3 relations=['references'] locations=['Line 26', 'Line 27', 'Line 28'] contexts=['']
  - server_access -> server_access_createaccessguard edges=2 relations=['contains', 'indirect_call'] locations=['L69', 'L8'] contexts=['', 'collection']
  - server_access_createaccessguard -> server_access_createaccessguard_authenticated edges=2 relations=['calls', 'contains'] locations=['L13', 'L28'] contexts=['', 'call']
  - server_app -> server_app_createbackend edges=2 relations=['contains', 'indirect_call'] locations=['L17', 'L380'] contexts=['', 'collection']
note: normal graph.json is post-build; raw producer loss must be measured earlier.
```
