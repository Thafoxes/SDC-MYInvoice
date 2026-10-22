# Graph Report - SDC-test  (2026-10-23)

## Corpus Check
- Corpus is ~45,276 words - fits in a single context window. You may not need a graph.

## Summary
- 818 nodes · 1820 edges · 47 communities (42 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- State and invoice actions
- Development commands
- Invoice review and payments
- Action Center approvals
- Collection dashboard
- Seller progress
- Demo simulation controls
- Build and runtime dependencies
- Planned email workflow
- Legacy Telegram receipts
- Reminder tone editing
- Project setup and scope
- Build and runtime dependencies
- Order intake and approval
- Customer history
- Shared business records
- Money and date formatting
- Invoice browsing
- Phone lookup and onboarding
- Shared attention queue
- OCR and AI integrations
- Frontend HTTP serving
- Application shell
- Invoice assistant rules
- Assistant conversation
- Navigation and notifications
- Payment feedback
- Browser backend commands
- Customer and order rules
- Frontend compiler settings
- Demo passcode screen
- Customer payment priorities
- Replit deployment notes
- Frontend compiler settings
- Shared display labels
- Test compiler settings
- HTTP and SQLite backend
- Build and runtime dependencies
- Build and runtime dependencies
- Legacy integration setup
- Reminder safeguard history
- Demo access guard
- Server compiler settings
- Customer and order rules
- Python environment

## God Nodes (most connected - your core abstractions)
1. `getStore()` - 33 edges
2. `computeInvoiceWithCustomer()` - 33 edges
3. `sumMoney()` - 28 edges
4. `refreshStore()` - 26 edges
5. `vue` - 23 edges
6. `update()` - 22 edges
7. `addActivity()` - 22 edges
8. `useDemoStore()` - 20 edges
9. `DEMO_BUSINESS_ID` - 20 edges
10. `createBackend()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/customer-orders-server.test.cjs → server/app.cjs
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/rewrite.test.cjs → server/app.cjs
- `fixture()` --calls--> `createBackend()`  [EXTRACTED]
  tests/telegram.test.cjs → server/app.cjs
- `onStorage()` --calls--> `refreshStore()`  [EXTRACTED]
  src/App.vue → src/composables/useDemoStore.ts
- `flags` --calls--> `responseFlags()`  [EXTRACTED]
  src/components/CustomerReplyCard.vue → src/lib/replyAnalysis.ts

## Import Cycles
- None detected.

## Communities (47 total, 5 thin omitted)

### Community 0 - "State and invoice actions"
Cohesion: 0.11
Nodes (65): actionForBusiness(), ActionResult, actorForBusiness(), applyCustomerReply(), approveFollowUp(), balanceForInvoice(), cancelAction(), checkEligibility() (+57 more)

### Community 1 - "Development commands"
Cohesion: 0.04
Nodes (45): dependencies, chart.js, lucide-vue-next, vue, vue-chartjs, vue-router, devDependencies, autoprefixer (+37 more)

### Community 2 - "Invoice review and payments"
Cohesion: 0.07
Nodes (33): act(), amount, busy, date, decide(), emit, flags, notice (+25 more)

### Community 3 - "Action Center approvals"
Cohesion: 0.07
Nodes (29): lucide-vue-next, emit, stageTone(), approveFollowUp, sendApprovedFollowUp, telegramEnabled, activity, custMap (+21 more)

### Community 4 - "Collection dashboard"
Cohesion: 0.08
Nodes (30): sumMoney(), outstandingFor(), aging, bizId, chartOptions, collected, currentBusiness, currentUser (+22 more)

### Community 5 - "Seller progress"
Cohesion: 0.10
Nodes (27): collected, dash, { data }, draft, editing, goal, input, monthName (+19 more)

### Community 6 - "Demo simulation controls"
Cohesion: 0.10
Nodes (27): advanceDate(), {data,refreshStore}, expanded, notice, paymentAmount, paymentDate, paymentInvoice, paymentMethod (+19 more)

### Community 8 - "Planned email workflow"
Cohesion: 0.09
Nodes (20): Business rules to implement, How documents enter the system, Main seller flow, Minimum data additions, Minimum system contents, Not in this proof of concept, NudgeWise email proof-of-concept plan, Official email references (+12 more)

### Community 9 - "Legacy Telegram receipts"
Cohesion: 0.12
Nodes (16): Current project and reuse, Phase 1: Replace Telegram coupling with email-ready backend access, vue, busy, chatId, customerId, customers, { data } (+8 more)

### Community 10 - "Reminder tone editing"
Cohesion: 0.14
Nodes (20): emit, finish(), generate(), lang, loading, preview, props, remember (+12 more)

### Community 11 - "Project setup and scope"
Cohesion: 0.09
Nodes (22): 1. Install dependencies (once), 2. Add your keys to `.env`, 3. Start the backend — Terminal 1, 4. Start the frontend — Terminal 2, 5. Connect Telegram and try it, Checks, Common problems, Customer and order workflow (+14 more)

### Community 12 - "Build and runtime dependencies"
Cohesion: 0.11
Nodes (8): typescript, mem, root, display, source, facts, format, tone

### Community 13 - "Order intake and approval"
Cohesion: 0.10
Nodes (20): approvePurchaseOrder, createPurchaseOrder, activeOrder, activeOrderId, actor, approve(), busy, customer (+12 more)

### Community 14 - "Customer history"
Cohesion: 0.09
Nodes (18): currentBusiness, currentUser, { data, refreshStore }, drawerOpen, expandedPriority, intakeCustomer, intakeCustomerId, langNotice (+10 more)

### Community 15 - "Shared business records"
Cohesion: 0.16
Nodes (18): StoreData, ActivityEvent, AiConversation, ApprovalState, Business, CustomerResponse, CustomerResponseWithInvoice, DemoState (+10 more)

### Community 16 - "Money and date formatting"
Cohesion: 0.14
Nodes (12): addMoney(), fromCents(), toCents(), Receipt, ReceiptExtraction, receiptProblem(), SentInvoice, validateExtraction() (+4 more)

### Community 17 - "Invoice browsing"
Cohesion: 0.10
Nodes (17): currentBusiness, currentPage, currentUser, { data }, drawerOpen, filteredInvoices, pageData, pages (+9 more)

### Community 18 - "Phone lookup and onboarding"
Cohesion: 0.13
Nodes (18): busy, choose(), { data, refreshStore }, emit, error, extracted, form, matches (+10 more)

### Community 19 - "Shared attention queue"
Cohesion: 0.18
Nodes (15): { data }, emit, expanded, items, props, visible, AttentionItem, getAttention() (+7 more)

### Community 20 - "OCR and AI integrations"
Cohesion: 0.20
Nodes (12): Phase 4: Send and receive email, chat(), classifyReply(), download(), extract(), extractCustomer(), readDocument(), readLimited() (+4 more)

### Community 21 - "Frontend HTTP serving"
Cohesion: 0.15
Nodes (5): root, serveFrontend(), types, fixture(), fixture()

### Community 22 - "Application shell"
Cohesion: 0.14
Nodes (13): vue-router, {data,refreshStore}, mainContent, notifications, onStorage(), seller, business, { data } (+5 more)

### Community 23 - "Invoice assistant rules"
Cohesion: 0.15
Nodes (12): invoices, current, AI_CATEGORIES, AiClassification, askAiAssistant(), deterministicAnswer(), formatDate(), computeInvoiceWithCustomer() (+4 more)

### Community 24 - "Assistant conversation"
Cohesion: 0.20
Nodes (13): addAiMessage, askAiAssistant, clearAiConversation, clear(), {data,refreshStore}, input, loading, messages (+5 more)

### Community 25 - "Navigation and notifications"
Cohesion: 0.18
Nodes (11): formattedDate, openNotification(), props, {refreshStore}, route, router, showNotifs, showProfile (+3 more)

### Community 26 - "Payment feedback"
Cohesion: 0.18
Nodes (11): arm(), confetti, { data }, known, paid, pieces, props, stopArmWatch (+3 more)

### Community 27 - "Browser backend commands"
Cohesion: 0.26
Nodes (12): refreshStore(), replaceSnapshot(), checkAccess(), command(), editFollowUpMessage, refreshServer(), setCustomerLanguage, applyStudio() (+4 more)

### Community 28 - "Customer and order rules"
Cohesion: 0.30
Nodes (11): approvePurchaseOrder(), boundedText(), createCustomer(), createPurchaseOrder(), CustomerExtraction, CustomerInput, lookupCustomersByPhone(), normalizePhone() (+3 more)

### Community 29 - "Frontend compiler settings"
Cohesion: 0.17
Nodes (12): compilerOptions, baseUrl, module, moduleResolution, noUnusedLocals, noUnusedParameters, paths, skipLibCheck (+4 more)

### Community 30 - "Demo passcode screen"
Cohesion: 0.18
Nodes (7): AccessState, authenticated, message, passcode, state, submitting, backendEnabled

### Community 31 - "Customer payment priorities"
Cohesion: 0.20
Nodes (10): calculateCustomerPriorities(), PriorityLevel, SettledEvidence, settlementDate(), Credit, Customer, Payment, priorityRecords (+2 more)

### Community 32 - "Replit deployment notes"
Cohesion: 0.20
Nodes (7): NudgeWise on Replit, Publishing configuration (not yet published), Run, Scope and constraints, Secrets and origins, SQLite persistence: important, Verification

### Community 33 - "Frontend compiler settings"
Cohesion: 0.20
Nodes (6): Project Structure, @vue/tsconfig/tsconfig.dom.json, extends, include, exclude, include

### Community 34 - "Shared display labels"
Cohesion: 0.24
Nodes (9): CustomerPriority, DerivedLabel, formatShortPriorityReason(), getDerivedLabelChips(), getDerivedLabels(), plural(), Invoice, InvoiceWithCustomer (+1 more)

### Community 35 - "Test compiler settings"
Cohesion: 0.20
Nodes (10): compilerOptions, baseUrl, module, moduleResolution, noEmitOnError, outDir, paths, skipLibCheck (+2 more)

### Community 36 - "HTTP and SQLite backend"
Cohesion: 0.44
Nodes (9): createBackend(), attention(), monitor(), poll(), receive(), receiveReply(), sendApproved(), transaction() (+1 more)

### Community 38 - "Build and runtime dependencies"
Cohesion: 0.25
Nodes (7): Customer lookup and purchase-order approval, Find or add a customer, Order hold, Run and verify, Seller override, Try the demo, Where to make changes

### Community 39 - "Legacy integration setup"
Cohesion: 0.25
Nodes (7): Customer replies and promised payments, Local Telegram receipt test, Matching and failure handling, Opt-in: actual OCR/cloud inference and an end-of-week reply/attention test; Telegram delivery is mocked., Setup, Storage and checks, Try the complete flow

### Community 40 - "Reminder safeguard history"
Cohesion: 0.33
Nodes (5): NudgeWise — Phase 1 + 2 Changes, Phase 1, Phase 2, User upgrade note, Verification

### Community 41 - "Demo access guard"
Cohesion: 0.53
Nodes (4): createAccessGuard(), authenticated(), digest(), equal()

### Community 42 - "Server compiler settings"
Cohesion: 0.40
Nodes (4): ./tsconfig.logic-tests.json, compilerOptions, outDir, extends

### Community 43 - "Customer and order rules"
Cohesion: 0.67
Nodes (3): getOrderEligibility(), intakeEligibility, eligibility

## Knowledge Gaps
- **361 isolated node(s):** `name`, `private`, `version`, `type`, `start` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 427 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where to make changes` connect `Build and runtime dependencies` to `State and invoice actions`, `Build and runtime dependencies`, `Legacy Telegram receipts`, `Order intake and approval`, `Phone lookup and onboarding`, `OCR and AI integrations`, `Customer and order rules`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _361 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State and invoice actions` be split into smaller, more focused modules?**
  _Cohesion score 0.11026156941649899 - nodes in this community are weakly interconnected._
- **Why does `Current project and reuse` connect `Legacy Telegram receipts` to `State and invoice actions`, `Development commands`, `Build and runtime dependencies`, `Build and runtime dependencies`, `Demo access guard`, `Shared business records`, `Money and date formatting`, `OCR and AI integrations`, `Application shell`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `Development commands` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Invoice review and payments` be split into smaller, more focused modules?**
  _Cohesion score 0.07394957983193277 - nodes in this community are weakly interconnected._
- **Should `Action Center approvals` be split into smaller, more focused modules?**
  _Cohesion score 0.07007575757575757 - nodes in this community are weakly interconnected._
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
nodes: 781
unverified_code_nodes: 0
raw_edges: 1889
valid_candidate_edges: 1795
missing_endpoint_edges: 0
dangling_endpoint_edges: 40
external_reference_edges: 54
self_loop_edges: 1
exact_duplicate_edges: 0
directed_unique_endpoint_pairs: 1728
directed_same_endpoint_collapsed_edges: 67
undirected_unique_endpoint_pairs: 1727
undirected_same_endpoint_collapsed_edges: 68
same_endpoint_group_count: 65
relation_variant_groups: 48
source_file_variant_groups: 0
source_location_variant_groups: 17
context_variant_groups: 0
post_build_graph_type: DiGraph
post_build_edges: 1820
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
  - server_app -> server_app_createbackend edges=2 relations=['contains', 'indirect_call'] locations=['L17', 'L334'] contexts=['', 'collection']
note: normal graph.json is post-build; raw producer loss must be measured earlier.
```
