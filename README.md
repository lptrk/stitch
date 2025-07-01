# 🧪 Stitch – Visual Workflow Runner
![image](https://github.com/user-attachments/assets/0d9ca5cd-e4d1-420c-8413-22e4f056fe64)
![image](https://github.com/user-attachments/assets/46bee3c8-cf18-483d-a848-56404feed245)
![image](https://github.com/user-attachments/assets/4e0badcf-0fa6-4508-8e82-a1b197e93caa)

**Stitch** is a visual E2E workflow test runner that allows you to define, inspect, and execute Playwright-based test blocks through an intuitive UI. Built with Next.js and Playwright.

---

## 🚀 Features

- Drag & drop workflow builder with customizable test blocks
- Built-in support for Playwright and custom block chaining
- Debugging, inspection and headless execution modes
- Fully local or containerized execution supported

---

# 🖥️ Getting Started (Local)

> Requires: **Node.js ≥ 18**, **pnpm**, and **Playwright**

## 1. Install dependencies

```bash
pnpm install
```
This installs dependencies for the main app as well as the test runner.

## 2. Install Playwright browsers
```bash
npx playwright install
```
This step is required for Playwright to function properly (downloads Chromium, etc.).

## 3. Start the application
```bash
pnpm dev
```
By default, the app runs on http://localhost:3000.

# 🐳 Running with Docker
Requires: Docker installed

## 1. Build the Docker image
```bash
docker build -t stitch-app .
```

## 2. Run the container
```bash
docker run -p 3000:3000 stitch-app
```
This will launch the app in production mode at http://localhost:3000.

🧪 Executing a Workflow
You can trigger workflow execution via the Stitch UI or directly through the test runner:

```bash
node runner/run-workflow.js workflows/example-with-chaining.json
```
In Docker:
```bash
docker exec -it <container-name> node runner/run-workflow.js workflows/example-with-chaining.json
```
📁 Project Structure
```
├── app/                     # Next.js app directory (UI + API)
├── runner/                  # Test execution logic (Playwright)
├── workflows/               # Example workflow JSON files
├── components/              # UI components
├── scripts/                 # Helper scripts
├── public/                  # Static assets
├── Dockerfile               # Docker configuration
├── package.json             # Main app + runner dependencies
```
📦 Production Build
To build for production:

```bash
pnpm build
```
Then start with:

```bash
pnpm start
```
🛠️ Tech Stack
Next.js

Playwright

Tailwind CSS

Radix UI

shadcn/ui

> ## ⚠️ Important: Vercel Can't Run Playwright Tests
>
> Vercel's infrastructure does **not allow installing or running browser engines**, which Playwright depends on.
>
> 🚫 This means test execution (e.g. Chromium launch) **will not work** on Vercel.
>
> ### ✅ Solution:
> - Use the provided **Docker setup** to run tests locally or in production
> - Or integrate with a **custom self-hosted runner** for executing workflows
