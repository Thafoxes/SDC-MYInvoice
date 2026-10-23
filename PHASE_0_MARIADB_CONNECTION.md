# NudgeWise — Phase 0 XAMPP MariaDB connection

This update is built on **NudgeWise Phases 1–6**. It does **not** connect SQLite to phpMyAdmin: it replaces the *persistent* SQLite database with XAMPP's MariaDB database when `DB_CLIENT=mariadb`. The abandoned old database is not imported.

## 1. On Ubuntu, start XAMPP

```bash
sudo /opt/lampp/lampp start
```

Open `http://localhost/phpmyadmin`, select **nudgewise_db**, and confirm your Phase 0 29 tables are present. **Do not re-import the schema or drop any tables.**

## 2. Create a dedicated local database user

Log into phpMyAdmin with an account allowed to manage database users. Open SQL and run the statements below, replacing `CHOOSE_A_STRONG_PASSWORD` **locally** with your own password:

```sql
CREATE USER IF NOT EXISTS 'nudgewise_app'@'127.0.0.1'
  IDENTIFIED BY 'CHOOSE_A_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE
  ON `nudgewise_db`.* TO 'nudgewise_app'@'127.0.0.1';
```

If `nudgewise_app` already exists, `CREATE USER IF NOT EXISTS` **will not change its password**. Set a password locally using `ALTER USER` if needed. XAMPP's account-host matching may use `localhost`; if the above user is rejected, create/grant a corresponding `'nudgewise_app'@'localhost'` user rather than using the root account in `.env`.

## 3. Install this updated code

Stop your previous frontend and backend. Keep the previous project as a backup. Unzip this ZIP in a **new** folder:

```bash
cd ~/Downloads
unzip NudgeWise_Phase0_XAMPP_MariaDB_Connected.zip -d ~/NudgeWise-MariaDB
cd ~/NudgeWise-MariaDB/SDC-MYInvoice-db
```

Copy your previous `.env` into this new project, if it exists, so you retain your AI credentials. **Do not copy an old `.local-data/demo.sqlite`.** Otherwise:

```bash
cp .env.example .env
nano .env
```

Edit or add **exactly one copy** of each setting:

```env
VITE_BACKEND_ENABLED=true
VITE_TELEGRAM_ENABLED=false
DB_CLIENT=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nudgewise_db
DB_USER=nudgewise_app
DB_PASSWORD=YOUR_LOCAL_DATABASE_PASSWORD
DOCLING_PYTHON=.venv/bin/python
AI_PROVIDER=auto
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

Never paste your password or API key into ChatGPT. Leave your existing cloud AI settings, if needed; the MariaDB change does not modify AI/OCR configuration.

**Important:** `npm install` must have internet access to install the new `mysql2` dependency and update the dependency lockfile. Using `npm ci` with the bundled original lockfile is not supported until you regenerate the lockfile with `npm install`.

```bash
npm install
npm run db:check
```

You should see `MariaDB connection: OK` and the database name `nudgewise_db`. If you see `Access denied`, check the database user/password and localhost account-host grant. If you see `ECONNREFUSED`, start XAMPP and confirm the database is on TCP port 3306.

## 4. Start the application

Terminal 1:

```bash
cd ~/NudgeWise-MariaDB/SDC-MYInvoice-db
npm run server
```

The backend should print:

```text
NudgeWise (MariaDB): http://127.0.0.1:8787
```

Terminal 2:

```bash
cd ~/NudgeWise-MariaDB/SDC-MYInvoice-db
npm run dev
```

Open the Vite URL (typically `http://localhost:5173`). Use **+ Add Customer**, then create a PO. Refresh the page and confirm the records remain. In phpMyAdmin run:

```sql
SELECT id, name, phone FROM customers ORDER BY created_at DESC;
SELECT id, order_reference, status FROM purchase_orders ORDER BY created_at DESC;
SELECT COUNT(*) AS runtime_snapshots FROM nw_runtime_state;
SELECT COUNT(*) AS evidence_files FROM nw_evidence_blobs;
```

After the first server startup, the database should have **31 tables**: the 29 imported Phase 0 tables plus `nw_runtime_state` and `nw_evidence_blobs`.

## How the connector actually stores data

- **MariaDB is the persistent source of truth.** `nw_runtime_state` stores the complete app snapshot, including fields not yet represented in the 29-table schema; `nw_evidence_blobs` stores original PO/chat evidence privately.
- Existing normalized tables are refreshed **transactionally as projections** of the saved app state, including `customers`, `purchase_orders`, `purchase_order_items`, `quotations`, `invoices`, `payments`, `receipts`, and progress stages. Tables for features not yet active can remain empty.
- **Do not directly edit rows in phpMyAdmin**: edits there will not feed back into the application and may be overwritten on the next save. This is an intermediate adapter for the hackathon MVP, *not* a fully normalized repository implementation.
- This demo adapter rewrites the projected tables on state changes; it is intended only for a **single local backend and synthetic data**, not production/multiple application instances or high-volume workloads.
- Legacy SQLite and Telegram-specific tests still use the original SQLite backend by default; active MariaDB mode never creates `demo.sqlite`. Telegram sending is explicitly disabled in MariaDB mode until the email phase.
- Full production use requires per-user authentication, data isolation, reliable database migrations, and a proper normalized repository.

## Regression checks

```bash
npm run server:build
npm run test:mariadb
npm run test:workflow
npm run test:po
```

The `test:mariadb` suite checks adapter behavior and relational constraints with fixtures. It does not access your real XAMPP instance. **`npm run db:check` and a live create/refresh/phpMyAdmin check are still required locally.**
