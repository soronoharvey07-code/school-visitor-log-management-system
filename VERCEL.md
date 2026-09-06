# Deploying to Vercel Guide

This application is fully structured and configured for deployment on **Vercel** with a Vite React frontend and Express Serverless API.

---

## 🚀 Quick Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Push this project to your GitHub, GitLab, or Bitbucket account.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your Git repository.
4. Vercel will automatically detect the settings from `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
5. *(Optional)* In **Environment Variables**, add:
   - `JWT_SECRET`: A secure random string used to sign session tokens (e.g. `openssl rand -hex 32`).
6. Click **Deploy**.

---

### Option 2: Deploy via Vercel CLI

1. Install the Vercel CLI globally if you haven't already:
   ```bash
   npm i -g vercel
   ```
2. Run the deployment command from the project root:
   ```bash
   vercel
   ```
3. For production deployment:
   ```bash
   vercel --prod
   ```

---

## ⚙️ How It Works Under the Hood

- **Frontend Static Hosting**:
  Vite compiles the React application into `dist/`. Vercel distributes the static assets globally over its Edge CDN.

- **Serverless API (`/api/*`)**:
  Requests matching `/api/*` and `/uploads/*` are automatically routed by `vercel.json` to the serverless function in `api/index.ts`.

- **Single Page Application Routing**:
  All client-side routes (e.g., `/admin`, `/visitors`, `/register/:id`) fall back to `index.html` via Vercel rewrites.

- **SQLite Database on Serverless**:
  In Vercel's serverless environment, the filesystem root is read-only. The system automatically initializes and copies the database into the writable `/tmp/database.sqlite` partition so that write operations (visitor logs, check-ins, event pre-registrations, settings) run seamlessly without permission errors.

---

## 🔑 Default Credentials

- **Admin Account**:
  - **Username**: `Admin2026`
  - **Password**: `RHMC_2026`
- **Security / Guard Account**:
  - **Username**: `Guard`
  - **Password**: `2026_RHMC`
