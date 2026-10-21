# NudgeWise frontend tech stack

Updated: 21 October 2026. Versions below are declared in `package.json`, not upgrade recommendations.

| Area | Technology | Purpose |
| --- | --- | --- |
| UI framework | Vue `^3.5.13` | Single-file components, Composition API, and `<script setup>` |
| Language | TypeScript `~5.6.3` | Typed views, domain data, and business rules |
| Build tooling | Vite `^5.4.11`, `@vitejs/plugin-vue` `^5.2.1` | Development server and production bundle |
| Routing | Vue Router `^4.5.0` | Dashboard, Action Center, and AI Assistant; hash-based routing |
| Styling | Tailwind CSS `^3.4.17`, PostCSS, Autoprefixer | Existing blue theme, responsive layouts, and shared CSS classes |
| Icons | `lucide-vue-next` `^0.468.0` | Navigation and action icons |
| Charts | Chart.js `^4.4.7`, vue-chartjs `^5.3.2` | Invoice status and payment collection charts |
| State | Vue `ref` / `computed`, `useDemoStore` | Reactive access to the existing local store |
| Persistence | Browser localStorage | Synthetic demo data under `nudgewise-demo-v1.1` |
| Validation | vue-tsc `^2.2.0`, Node.js built-in test runner | Type checking and existing business-rule regression tests |

## Simplified frontend layout

The existing visual style is retained. No framework migration or new package is required.

- **Dashboard:** three financial totals, the review queue, and a searchable invoice table. Customer priorities and collection reports expand on demand using native `details` / `summary` elements.
- **Invoices:** six columns for invoice, customer, outstanding balance, due date, status, and viewing details. Full invoice details remain in the existing drawer; customer evidence remains in Customer priorities.
- **Action Center:** opens on Awaiting Approval. Customer responses, exceptions, history, and the combined All view remain available.
- **AI Assistant:** keeps the existing simulated chat and suggested questions; the input has an accessible name.
- **Demo Controls:** collapsed below page content, so they no longer float over tables or action buttons.
- **Navigation:** retains the three working pages and removes placeholder Settings / Seller Profile rows. The header profile menu remains available.
- **Accessibility:** visible keyboard focus, labelled dashboard filters and pagination, pressed/expanded control states, a skip link, and reduced-motion support.

## Component approach

Reuse `BaseModal`, `StatusBadge`, `InvoiceDetailDrawer`, existing button/form classes, and native HTML disclosure elements. **shadcn-vue is not installed**: this layout pass does not need additional component primitives or dependencies. If a later feature needs a complex accessible widget, evaluate the Vue-compatible shadcn-vue rather than React shadcn/ui.

## Boundaries

This is still a frontend prototype. AI responses, reminder delivery, payments, and identities are simulated. There is no connected backend, SQL database, trusted authentication, external AI inference, or messaging API. Telegram, Orbyte, Replit backend hosting, and RunPod/Ollama integration are future work, not frontend capabilities delivered by this change.

## Development checks

- `npm run dev` — Vite development server.
- `npm run build` — Vue/TypeScript checks and production build.
- `npm run test:logic` — existing local business-rule tests; does not cover browser interaction or external services.

## Documentation reference

Context7 was used to check [Vue list rendering](https://vuejs.org/guide/essentials/list) and [TypeScript with Vue](https://vuejs.org/guide/typescript/overview). Existing computed lists and stable keys are retained while reorganising the presentation.
