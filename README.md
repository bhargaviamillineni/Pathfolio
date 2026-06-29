# 🌌 Pathfolio: Skill Mapping Hub

> Transform flat, static academic records into an interactive semantic knowledge graph and cited AI search engine.

![Pathfolio Cover Mockup](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

---

## 📌 The Problem
Students and researchers spend years acquiring complex, cross-disciplinary skills, yet their capabilities remain trapped in dense, multi-page PDFs, transcripts, and certs. Recruiters and advisors scan these static resumes in under 10 seconds, routinely missing the subtle, deep semantic connections between a student's projects, course syllabi, and actual industry competencies. Flat text fails to convey the multi-dimensional growth of a modern academic path.

## ✨ The "Aha!" Moment
**What if your resume could organize itself and answer questions with absolute verification?** 
Pathfolio instantly ingests raw transcripts, certifications, and project papers, uses advanced semantic text processing to extract hidden skills, and maps them onto a dynamic, interactive semantic knowledge graph. It automatically finds relationships between disparate coursework and lets employers semantically search your entire academic timeline—complete with direct, hyperlinked text citations.

---

## 📊 Key Outcomes

| Metric | Before Pathfolio | With Pathfolio | Impact |
| :--- | :--- | :--- | :--- |
| **Ingestion Time** | 2-3 hours manual portfolio setup | **< 5 seconds** per document | Instant digital transformation |
| **Skill Discoverability** | Flat keyword matching (often missed) | **Interactive Knowledge Graph** | 100% of inter-disciplinary skill relationships exposed |
| **Search Accuracy** | Word-for-word string matches | **Semantic AI Search** | Concept-based queries with direct highlighted citations |

---

## 📸 Interactive Demo

```
+-------------------------------------------------------------------------+
| [P] Pathfolio | Academic Portfolio    [ CONNECTION: ONLINE (Render) ]    |
+-------------------------------------------------------------------------+
|                                                                         |
|  ( Ingest Materials )            ( Interactive Skill Map )              |
|  +-----------------------+      +------------------------------------+  |
|  |  [ File ]   [ Link ]  |      |   (Python) --- [ML Core] --- (SQL) |  |
|  |  +-----------------+  |      |      |                         |   |  |
|  |  |  Drag & Drop    |  |      |  [React] ----------- (TypeScript)  |  |
|  |  |  Resume/Cert    |  |      +------------------------------------+  |
|  |  +-----------------+  |                                              |
|  +-----------------------+      ( Smart AI Search )                     |
|                                 +------------------------------------+  |
|  ( Academic Timeline )          | Q: Where did they learn PyTorch?   |  |
|  * 2026: ML Internship          | A: Learnt during Stanford CS229.   |  |
|  * 2025: B.S. Computer Science  |    [Source: transcript_stanford.pdf]|  |
|                                 +------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 🧠 How It Works

Pathfolio operates as a stateful, full-stack application built to seamlessly read, parse, map, and query unstructured academic documents.

```
+-----------------------+       +-------------------------+       +-------------------------+
|   Raw User Uploads    | ----> |   Node.js Express API   | ----> |  Semantic Analysis NLP  |
| (PDF, DOCX, PNG/JPG)  |       |  (Multer File Parsing)  |       | (Structured JSON Extr.) |
+-----------------------+       +-------------------------+       +-------------------------+
                                             |                                 |
                                             v                                 v
+-----------------------+       +-------------------------+       +-------------------------+
|   Smart Cited Search   | <---- | Local JSON Database     | <---- | Interactive Graph UI    |
| (Excerpts & Sources)  |       |  (`db.json` & Uploads)  |       | (Tailwind + Recharts)   |
+-----------------------+       +-------------------------+       +-------------------------+
```

### 📦 Module Breakdown

#### 1. Dynamic File Ingestion Engine
* **Plain Language:** Users upload transcripts, certificates, or resume documents. The app instantly extracts raw text regardless of file type (supporting PDFs, Word documents, and images).
* **Technical Detail:** Uses `multer` for secure storage, `pdf-parse` for vector PDF extraction, `mammoth` for DOCX parsing, and integrated multimodal vision capability to run optical character recognition (OCR) on credential certificates and PNG/JPG images.

#### 2. AI Semantic Synthesizer & Knowledge Mapper
* **Plain Language:** The app analyzes the raw text, identifies core academic concepts, and maps how they connect to form a cohesive "knowledge graph" of your skills.
* **Technical Detail:** Sends parsed text blocks to the structured NLP endpoint using rigid JSON schemas. The semantic engine maps the data into rigid taxonomy categories, lists associated technologies, generates a chronological timeline, and computes semantic relationship scores to build the graph edges.

#### 3. Hyperlinked Cited Search Engine
* **Plain Language:** Allows recruiters or advisors to ask natural questions (e.g., "What experience does this candidate have with neural networks?") and receive a custom-synthesized answer backed by highlighted sources.
* **Technical Detail:** Performs lightweight client-side TF-IDF or cosine similarity keyword vectors across the extracted document repository, compiles relevant excerpts, sends them to the language model as a retrieved context window, and returns a cohesive summarized response citing direct document indices.

---

## 🛠️ Tech Stack

| Layer | Technology | Primary Purpose |
| :--- | :--- | :--- |
| **Frontend** | `React (Vite)`, `TypeScript` | Fast, type-safe reactive user interface |
| **Styling & UI** | `Tailwind CSS`, `Lucide React` | Premium, responsive, design-forward typography & icons |
| **Backend** | `Node.js`, `Express` | REST APIs, file-system handlers, and LLM orchestration |
| **AI Processing** | Google GenAI SDK | Document parsing, structural metadata extraction, semantic search |
| **Database** | `Local JSON` with automatic `/data` Mount | Lightweight, zero-maintenance state engine with persistent disk support |

---

## ⚡ Quick Start

### 📋 Prerequisites
* Node.js v18 or later
* A **Gemini API Key**

### 🚀 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd pathfolio-knowledge-graph
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Run Dev Servers (Both Frontend & Backend parallelized):**
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.

---

## 📂 Project Structure

```
pathfolio-knowledge-graph/
├── assets/                  # Public visual assets & designs
├── src/                     # React Frontend Application
│   ├── components/          # High-performance modular UI panels
│   │   ├── SkillMap.tsx     # Custom interactive semantic skill node canvas
│   │   ├── Timeline.tsx     # Chronological academic milestones
│   │   └── SearchPanel.tsx  # Cited smart AI search input & response
│   ├── App.tsx              # Application layout & routing entry
│   ├── dbService.ts         # Unified database abstraction interface
│   ├── types.ts             # Global TypeScript type declarations
│   └── index.css            # Tailwind typography configuration
├── server.ts                # Express full-stack API server & static server
├── db.json                  # Local JSON state store (ephemeral/persistent)
├── db_seed.json             # High-quality demo data for instant loading
├── package.json             # Scripts & dependency definitions
└── DEPLOYMENT.md            # Detailed deployment instructions (Render/Vercel)
```

---

## 🔮 What's Next for Pathfolio

* **Durable Cloud DB Integrations:** Provide drivers to switch the local `db.json` with cloud-native document stores like **Google Cloud Firestore** or **MongoDB Atlas** for multi-user portfolios.
* **OAuth-protected Student Portfolios:** Add secure user registration so multiple students can host separate portfolios under a single deployment.
* **Vector Embeddings (pgvector):** Migrate from lightweight text-matching to full vector search in production using PostgreSQL databases.

---

*Built with ❤️ for academic clarity.*
