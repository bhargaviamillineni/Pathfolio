# 🚀 Deployment Guide: Pathfolio Knowledge Graph

This application is a full-stack **React (Vite) + Node.js (Express)** app. It uses the Gemini API for semantic document analysis, stores portfolio metadata in a lightweight local `db.json` file, and saves uploaded documents directly in an `uploads/` folder.

Because the app is **stateful** (it writes data to the filesystem), we recommend **Render** as the primary deployment target, as it supports **Persistent Disks**.

---

## 📌 Option 1: Render (Highly Recommended)

Render is the perfect choice for full-stack Node.js servers with local file uploads. By using a **Persistent Disk**, you ensure that your uploaded documents and `db.json` states are preserved across server restarts.

### Step-by-Step Render Setup

1. **Create a Web Service on Render:**
   - Log in to [Render](https://render.com/).
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.

2. **Configure App Settings:**
   - **Name:** `pathfolio-knowledge-graph`
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`

3. **Add Environment Variables:**
   Under the **Environment** tab, add:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API Key)*

4. **Add a Persistent Disk (Crucial for keeping your data!):**
   Since Render instances restart periodically, any files stored in the container (like `db.json` or PDF uploads) are lost unless saved to a persistent disk.
   - Go to the **Disks** tab in your Render Web Service settings.
   - Click **Add Disk**.
   - **Name:** `pathfolio-data`
   - **Mount Path:** `/data` (We will configure the app to optionally use `/data` if present, see below).
   - **Size:** `1 GB` (usually free tier compatible).

---

## ⚡ Option 2: Vercel (Frontend & Serverless)

Vercel is designed for **stateless serverless architectures**. You can deploy this app to Vercel, but note that **any file uploads and database changes (`db.json`) will be temporary and lost when serverless instances spin down**. 

To deploy on Vercel, we provide a `vercel.json` file that routes traffic to a serverless function wrapper.

### Step-by-Step Vercel Setup

1. **Install Vercel CLI or Connect GitHub:**
   - Push your code to GitHub.
   - Import your repository into [Vercel](https://vercel.com/).
2. **Configure Build Settings:**
   - Vercel automatically detects the Vite config and handles building.
3. **Configure Environment Variables:**
   - Add `GEMINI_API_KEY` to your Vercel Project settings.

---

## 🛠️ Making the App Production-Ready for Disks

To ensure the application automatically detects and uses Render's persistent disk `/data` (if configured), we can add a check in our codebase to store `db.json` and `uploads/` inside the `/data` directory when running in production.

Let's make this small update to `server.ts` so that persistent disk support works seamlessly!
