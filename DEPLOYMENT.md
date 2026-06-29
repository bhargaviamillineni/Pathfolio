# 🚀 Deployment Guide: Pathfolio Knowledge Graph

This application is a full-stack **React (Vite) + Node.js (Express)** app. It uses the Gemini API for semantic document analysis, stores portfolio metadata in a lightweight local `db.json` file, and saves uploaded documents directly in an `uploads/` folder.

Because the app relies on writing to the local filesystem (`db.json` and the `uploads/` directory), deployment behavior differs depending on your hosting provider and tier.

---

## 📌 Option 1: Render (Recommended)

Render supports full-stack Node.js Express servers out-of-the-box. Below are the steps for both the **Free Tier** and the **Premium Tier with Persistent Disks**.

### 🆓 1. Render Free Tier (Zero-Cost, Ephemeral State)
You can deploy this application on Render's **Free Tier** completely for free.
- **How it works:** The app is fully functional! You can upload new resume PDFs, certificates, and projects, and the smart search and graph visualization will update immediately in real-time.
- **Limitation:** Since Render Free Tier does not support Persistent Disks, the container's storage is **ephemeral**. Any files you upload and any custom graph configurations saved to `db.json` will reset back to the default seeded state when the service goes to sleep (after 15 minutes of inactivity) or restarts (at least once a day).
- **Best for:** Portfolios, client demos, and quick prototypes where the 4 pre-seeded documents are sufficient and new uploads are only for temporary testing.

### 💼 2. Render Paid Tier (Durable State with Persistent Disk)
If you want your uploads and database state to be permanently saved across restarts and container sleeps:
- **How it works:** Render offers a **Persistent Disk** (for an extra $1/month or similar).
- **The code is already pre-configured!** Our backend automatically detects if a persistent Render `/data` disk is attached. If detected, it automatically routes the `db.json` file and your uploaded documents to `/data/db.json` and `/data/uploads/`, completely preserving them.

### Step-by-Step Render Setup (Free or Paid)

1. **Push your code to GitHub:**
   - Create a GitHub repository and push this project's code to it.

2. **Create a Web Service on Render:**
   - Log in to [Render](https://render.com/).
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.

3. **Configure Settings:**
   - **Name:** `pathfolio-knowledge-graph`
   - **Language:** `Node`
   - **Branch:** `main` (or your default branch)
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** Select **Free** (or select a paid plan if you wish to attach a persistent disk).

4. **Add Environment Variables:**
   Under the **Environment** tab, click **Add Environment Variable** and add:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API Key)*

5. **Attach a Persistent Disk (Paid Tier Only):**
   - Go to the **Disks** tab in your Render Web Service settings.
   - Click **Add Disk**.
   - **Name:** `pathfolio-data`
   - **Mount Path:** `/data`
   - **Size:** `1 GB` (More than enough for thousands of resumes/documents).
   - Save the configuration. Render will rebuild and link your database and uploads folders to the secure persistent disk.

---

## ⚡ Option 2: Vercel (Frontend & Serverless)

Vercel is designed for **stateless serverless architectures** and static frontends. 

### ⚠️ Limitations on Vercel
Because Vercel runs on **Serverless Functions**:
1. **Read-Only File System:** Vercel serverless functions do not allow writing to the local disk. Thus, attempting to upload a document or update `db.json` in production will fail or throw errors.
2. **Ephemeral Containers:** Serverless functions spin up and down constantly. They do not share storage across requests.
3. **Verdict:** We **strongly recommend Render over Vercel** for this specific application because of the full-stack nature of document uploads and local JSON persistence.

### If you still want to deploy to Vercel:
If you want to use Vercel, you would deploy the **frontend only** (static SPA) and connect it to a separate hosted backend, or restructure the backend code to:
1. Save uploads to an external cloud bucket like **Amazon S3**, **Supabase Storage**, or **Cloudinary**.
2. Save portfolio database states to a cloud database like **MongoDB Atlas** or **Supabase PostgreSQL**.

---

## 🛠️ Troubleshooting & FAQs

### 1. I get a "CONNECTION LOST OR SERVER OFFLINE. RETRYING IN BACKGROUND..." screen
If you see this error after deploying:
* **The Root Cause:** You deployed the app as a **Static Site** (or only built the frontend). Because this is a full-stack application, the frontend is trying to contact the Node/Express backend (`/api/...`) but no server is running to answer!
* **How to fix on Render:**
  1. Delete the "Static Site" from your Render Dashboard.
  2. Create a new service and choose **Web Service** instead of *Static Site*.
  3. Ensure your Build Command is `npm run build` and your Start Command is `npm run start`.
  4. Now Render will boot the real Node backend, which serves both the frontend assets and answers the API requests correctly.

### 2. How do the frontend and backend communicate? Do I need to set an API URL environment variable?
* **No, you do not need an environment variable!** 
* **Why?** This application is compiled into a single full-stack service. In production, your Express backend (`server.ts`) serves the built static files from the `dist/` directory and listens for API calls on `/api/`.
* Because they run in the **same process on the same server, on the exact same port and domain**, they communicate natively using relative URLs (like `/api/documents`). This is extremely clean because:
  - There is no need for CORS (Cross-Origin Resource Sharing) configuration.
  - No environment variables are needed to tell the frontend where the API is.
  - It just works out-of-the-box!

---

## 🔍 How to Get Your Gemini API Key
To run the AI-powered search and automatic document analysis in production:
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API Key**.
3. Create a new API key and copy it.
4. Paste it as the `GEMINI_API_KEY` environment variable in your hosting platform (Render or your preferred server provider).
