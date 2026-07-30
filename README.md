# Stitch – Visual E2E Test Builder

Stitch lets you build end-to-end tests visually — no code required. You drag blocks together to describe what a user does in your app, run the test directly from the UI, and export the result as a ready-to-run Playwright test file.

It also exposes an **MCP server**, so an AI agent (Claude, etc.) can list blocks, run workflows, and build "live" workflows that you watch appear in the canvas in real time. It can connect to **GitLab** to pull specs and submit generated tests directly to a repo/MR, and ships a small **browser extension** for point-and-click selector picking.

---

## How it works

1. **Set your Base URL** — the address of the app you want to test (e.g. `http://localhost:3000` or `https://staging.yourapp.com`)
2. **Build a workflow** — drag blocks from the left sidebar into the canvas, or press `⌘K` / `Ctrl+K` to search and add one. Each block is one action: navigate to a page, click a button, fill a form, check that something is visible, etc.
3. **Run it** — hit "Run Test" (or `⌘↵` / `Ctrl+Enter`). Stitch executes the workflow against your app using Playwright and shows you which steps passed or failed.
4. **Export for CI** — once the workflow works, export it as a standalone Playwright test and drop it into your pipeline.

For selector-type parameters, install the [browser extension](#browser-extension) once to pick elements by clicking them instead of typing selectors by hand.

---

## Running locally

**Requirements:** Node.js ≥ 20, [pnpm](https://pnpm.io/installation)

There is no committed lockfile (`pnpm-lock.yaml` / `package-lock.json` are gitignored on purpose), so the first install resolves fresh versions within the ranges in `package.json`.

```bash
pnpm install
npx playwright install
```

Then create `.env.local` (gitignored, auto-loaded by Next.js — **required**, see below):

```bash
echo "API_KEY=$(openssl rand -hex 24)" >> .env.local
echo "NEXT_PUBLIC_API_KEY=$(grep API_KEY= .env.local | head -1 | cut -d= -f2)" >> .env.local
pnpm dev
```

App runs at `http://localhost:3000`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `API_KEY` | **Yes** | Server-side secret checked on every API route: `/api/mcp`, `/api/run-workflow*`, `/api/import-spec`, `/api/parse-code-block`, `/api/live-sessions/*`. Without it, those 500 with "API_KEY environment variable is not set" — which includes the in-app **Run Test** button, workflow-builder **Code mode**, and spec import, not just MCP/programmatic use. |
| `NEXT_PUBLIC_API_KEY` | **Yes, same value as `API_KEY`** | Exposed client-side so the web UI's own calls to those routes authenticate. Must match `API_KEY` exactly. |
| `HEADLESS` | No (default `true`) | Set to `false` to watch the browser while a workflow runs locally. |
| `DEBUG` | No | Set to `true` for verbose runner logs. |
| `IGNORE_HTTPS_ERRORS` | No | Set to `true` to ignore TLS errors when testing against self-signed/staging environments. |

Both vars are read once at server start — restart `pnpm dev` after creating or changing `.env.local`.

### Docker

```bash
docker build -t stitch .
docker run -p 3000:3000 -e API_KEY=your-key stitch
```

or with Compose (also mounts a persistent `data/` volume for GitLab config, auth states, downloads):

```bash
STITCH_API_KEY=your-key docker compose up
```

---

## MCP server

Stitch exposes an MCP endpoint at:

```
POST http://<host>:3000/api/mcp
```

It requires the `API_KEY` env var to be set on the server, and accepts it from the client in any of these ways (useful since not every MCP client can set custom headers):

- header `x-api-key: <API_KEY>`
- header `Authorization: Bearer <API_KEY>`
- query param `?apiKey=<API_KEY>` (for clients that can only set a URL)

**Example `mcp.json` / Claude Desktop config:**

```json
{
  "mcpServers": {
    "stitch": {
      "url": "http://localhost:3000/api/mcp",
      "headers": { "x-api-key": "YOUR_API_KEY" }
    }
  }
}
```

The endpoint is POST-only (stateless, one tool call per request — no session/SSE handshake needed).

### Available tools

| Tool | What it does |
|---|---|
| `list_blocks` | List built-in block ids, categories, and parameters. Call this first — every other tool validates `blockId` against this list. |
| `run_workflow` | Run a set of blocks against a real browser, get pass/fail per step back. Nothing is persisted server-side. |
| `generate_playwright_code` | Generate the Playwright `.spec.ts` Stitch would produce for a set of blocks, without running it. |
| `import_spec` | Parse an existing Playwright spec and return Stitch's structured view of it (matched blocks + unmatched raw code). |
| `inspect_page` | Open a URL in a throwaway browser and return ready-to-use selectors for every interactive element — use this instead of guessing selectors. |
| `start_session` / `add_step` / `run_session` / `end_session` | **Live Agent Sessions**: build a workflow step by step while a human watches it appear live in the Stitch canvas (they need the app open, subscribed via `/api/live-sessions/stream`). Use this instead of `run_workflow` when the build process itself should be visible. |

---

## GitLab integration

Connect Stitch to a GitLab instance to browse a project's tree, pull existing spec files, and submit generated tests back as a commit/MR — without leaving the app.

In **Settings → GitLab**: enter your GitLab base URL and a personal access token, then pick a project. Connection state (base URL, token, selected project) is stored server-side in `data/gitlab-config.json`, which is gitignored and lives in the Docker volume — it never gets committed and doesn't need to.

---

## Browser extension

The extension lets you click an element in your app instead of typing a CSS/data-testid selector by hand.

1. Open **Install extension** (button in the toolbar, or `/extension-install`) and download the `.zip`.
2. Unzip it, then in Chrome/Edge: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the unzipped folder.
3. Back in Stitch, click the picker icon (`@`) next to any selector field, then click the target element on your app's page. The selector is filled in automatically.

Selector priority the extension (and the MCP `inspect_page` tool) uses: `data-testid` family > stable `id` > `aria-label` > `name`/`placeholder` > button/link text > role > filtered class.

---

## Using the CI Export

This is the main integration path. You build and verify a workflow in Stitch, then export it as a self-contained test bundle that runs in any CI pipeline without Stitch.

### Step 1 – Export the bundle

In Stitch: **Export as Code → CI Bundle → Download CI Bundle (.zip)**

The ZIP contains:

| File | Purpose |
|------|---------|
| `tests/<name>.spec.ts` | The Playwright test in TypeScript |
| `playwright.config.ts` | Pre-configured with your base URL |
| `package.json` | Dependencies and npm scripts |
| `README.md` | This setup guide |

### Step 2 – Add it to your repo

Unzip and copy the files into your project, or into a dedicated `e2e/` folder:

```
your-repo/
├── e2e/
│   ├── tests/
│   │   └── my-workflow.spec.ts
│   ├── playwright.config.ts
│   └── package.json
└── ...
```

### Step 3 – Install and run

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
npm test
```

### Step 4 – Add to your pipeline

The test reads `BASE_URL` from the environment, falling back to the URL you had set in Stitch. Set it in your pipeline to point at the right environment:

```bash
BASE_URL=https://staging.yourapp.com npm test
```

**GitLab CI example:**

```yaml
e2e:
  image: mcr.microsoft.com/playwright:v1.44.0-jammy
  script:
    - cd e2e
    - npm ci
    - npm test
  variables:
    BASE_URL: $STAGING_URL
  artifacts:
    when: always
    paths:
      - e2e/playwright-report/
    expire_in: 7 days
```

**The Playwright Docker image already has all browsers installed**, so you can skip the `npx playwright install` step when using it.

---

## Blocks reference

Blocks are grouped into categories in the sidebar:

| Category | What it does |
|----------|-------------|
| Navigation | Go to a URL, reload, go back/forward |
| Interactions | Click, hover, drag & drop, scroll |
| Form Inputs | Fill, select, check, upload, press key |
| Assertions | Expect visible/hidden/text/URL/count/attribute |
| Waiting | Wait for time, element, network response |
| Screenshots | Take a screenshot of the page or an element |
| Data Extraction | Read text, attributes, input values |
| Advanced | Network mocking, auth state, cookies, viewport, tabs, downloads |

Blocks you use frequently can be saved as **Custom Blocks** with your own Playwright code. Custom blocks are exported inline into the spec file.

---

## Workflows

You can have multiple workflows in one session. Use **Call Workflow** to chain them — one workflow can call another as a sub-routine (e.g. a "Login" workflow called at the start of every other test).

Workflows are saved automatically in your browser. Use **Save to file** to export them as JSON and **Load from file** to restore them later or share with teammates.

---

## Tips & shortcuts

- **Selectors** — use `[data-testid="..."]` attributes in your app for stable selectors. CSS class names and IDs work too. Hover over the `?` icon next to any selector field for examples, or use the browser extension / MCP `inspect_page` tool to get real ones.
- **Base URL** — set it once at the top. All relative URLs in your blocks (e.g. `/login`) are resolved against it automatically.
- **Quick start** — if the canvas is empty, use the example buttons to load a pre-built workflow.
- Press `?` anywhere in the app to open the full shortcut cheatsheet. The essentials:

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette / add a block |
| `⌘↵` / `Ctrl+Enter` | Run workflow |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Y` | Redo |
| `↑` `↓` | Navigate steps in the canvas |
| `D` | Duplicate selected step |
| `⌫` | Delete selected step |
| `Esc` | Deselect / close dialog |
