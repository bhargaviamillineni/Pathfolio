import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { DBService } from "./src/dbService";

const PORT = 3000;

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configure Multer for file storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = DBService.UPLOADS_DIR;
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
  });

  // Ensure DB is initialized
  DBService.read();

  // --- API Routes ---

  // 1. Get documents
  app.get("/api/documents", (req, res) => {
    try {
      const db = DBService.read();
      // Remove embedding vector from list response to keep payload light
      const docsClean = db.documents.map(({ embedding, ...rest }) => rest);
      res.json(docsClean);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 2. Get relationships
  app.get("/api/relationships", (req, res) => {
    try {
      const db = DBService.read();
      res.json(db.relationships);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 3. Get timeline & narrative
  app.get("/api/timeline", (req, res) => {
    try {
      const db = DBService.read();
      const completed = db.documents.filter(d => d.status === "completed" && d.metadata);
      
      // Group documents by year
      const groupedByYear: { [year: string]: any[] } = {};
      
      completed.forEach(doc => {
        const dateStr = doc.metadata?.date || "";
        let year = "Unknown Year";
        if (dateStr) {
          const parts = dateStr.split("-");
          if (parts[0] && parts[0].length === 4) {
            year = parts[0];
          } else {
            year = dateStr.slice(0, 4);
          }
        }
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push({
          id: doc.id,
          title: doc.metadata?.title,
          category: doc.metadata?.category,
          issuingOrg: doc.metadata?.issuingOrg,
          date: doc.metadata?.date,
          summary: doc.metadata?.summary,
          technologies: doc.metadata?.technologies,
          createdAt: doc.createdAt
        });
      });

      // Sort chronological order (newest years first, then newest dates within years)
      const timeline: { year: string; items: any[] }[] = Object.keys(groupedByYear)
        .sort((a, b) => {
          if (a === "Unknown Year") return 1;
          if (b === "Unknown Year") return -1;
          return parseInt(b) - parseInt(a);
        })
        .map(year => ({
          year,
          items: groupedByYear[year].sort((a, b) => b.date.localeCompare(a.date))
        }));

      res.json({
        timeline,
        narrative: db.timelineNarrative
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 4. Ingest file upload (PDF/docx/Image)
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded." });
      }

      const db = DBService.read();
      const docId = `doc_${Date.now()}`;
      
      const newDoc: any = {
        id: docId,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        text: "",
        status: "processing",
        createdAt: new Date().toISOString(),
        fileSize: req.file.size
      };

      db.documents.push(newDoc);
      DBService.write(db);

      // Trigger asynchronous text extraction and processing pipeline (does not block HTTP response)
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      const originalName = req.file.originalname;

      DBService.ingestDocumentAsync(docId, filePath, mimeType, originalName)
        .catch(err => console.error(`Asynchronous processing failed for doc ${docId}:`, err));

      // Return response immediately
      res.status(202).json({
        message: "File uploaded. Ingestion and semantic analysis started asynchronously.",
        document: {
          id: newDoc.id,
          originalName: newDoc.originalName,
          mimeType: newDoc.mimeType,
          status: newDoc.status,
          createdAt: newDoc.createdAt,
          fileSize: newDoc.fileSize
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 5. Ingest Web Link
  app.post("/api/ingest-link", (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "No link/URL was provided." });
      }

      // Check URL format
      try {
        new URL(url);
      } catch (_) {
        return res.status(400).json({ error: "Invalid URL format." });
      }

      const db = DBService.read();
      const docId = `doc_link_${Date.now()}`;
      
      const newDoc: any = {
        id: docId,
        filename: "", // No local file
        mimeType: "text/html",
        originalName: url,
        sourceUrl: url,
        text: "",
        status: "processing",
        createdAt: new Date().toISOString(),
        fileSize: 0
      };

      db.documents.push(newDoc);
      DBService.write(db);

      // Trigger pipeline async
      DBService.ingestDocumentAsync(docId, "", "text/html", url, url)
        .catch(err => console.error(`Asynchronous URL processing failed for doc ${docId}:`, err));

      res.status(202).json({
        message: "Link captured. Web content parsing and knowledge mapping started asynchronously.",
        document: {
          id: newDoc.id,
          originalName: newDoc.originalName,
          mimeType: newDoc.mimeType,
          status: newDoc.status,
          createdAt: newDoc.createdAt,
          sourceUrl: newDoc.sourceUrl
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 6. Delete a document
  app.delete("/api/documents/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = DBService.read();
      
      const docIdx = db.documents.findIndex(d => d.id === id);
      if (docIdx === -1) {
        return res.status(404).json({ error: "Document not found." });
      }

      const doc = db.documents[docIdx];
      
      // Delete the actual uploaded file if it exists
      if (doc.filename) {
        const filePath = path.join(DBService.UPLOADS_DIR, doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Remove document
      db.documents.splice(docIdx, 1);

      // Remove corresponding relationships
      db.relationships = db.relationships.filter(r => r.sourceId !== id && r.targetId !== id);

      DBService.write(db);

      // Refresh narrative
      DBService.updateTimelineNarrative()
        .then(() => console.log("Narrative updated after deletion"))
        .catch(e => console.error("Narrative update failed", e));

      res.json({ success: true, message: "Document and relationships deleted." });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 6.5. Retry document ingestion
  app.post("/api/documents/:id/retry", (req, res) => {
    try {
      const { id } = req.params;
      const db = DBService.read();
      const docIdx = db.documents.findIndex(d => d.id === id);
      if (docIdx === -1) {
        return res.status(404).json({ error: "Document not found." });
      }

      const doc = db.documents[docIdx];
      doc.status = "processing";
      doc.error = undefined;
      DBService.write(db);

      const filePath = doc.filename ? path.join(DBService.UPLOADS_DIR, doc.filename) : "";
      
      DBService.ingestDocumentAsync(doc.id, filePath, doc.mimeType, doc.originalName, doc.sourceUrl)
        .catch(err => console.error(`Retry ingestion failed asynchronously for doc ${doc.id}:`, err));

      res.json({ success: true, message: "Ingestion pipeline restarted successfully.", document: doc });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 7. Reset to seed data (perfect for hackathon presentation resets!)
  app.post("/api/reset", (req, res) => {
    try {
      // Clear uploads folder but preserve the 4 original seed files
      const seedFilenames = new Set([
        "file-1782669355258-301212619.pdf",
        "file-1782670043693-279874350.pdf",
        "file-1782670173425-984702325.png",
        "file-1782670259954-750411330.pdf"
      ]);
      const uploadsDir = DBService.UPLOADS_DIR;
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          if (!seedFilenames.has(file)) {
            try {
              fs.unlinkSync(path.join(uploadsDir, file));
            } catch (_) {}
          }
        }
      }

      // Reset db file by deleting and reading again (triggers initial seed load)
      const dbFile = DBService.DB_FILE;
      if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
      }
      
      const freshState = DBService.read(); // This will auto-write from db_seed.json and return it
      res.json({ success: true, message: "Database successfully reset to initial seed values.", state: freshState });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 8. Serve ingested files with appropriate headers
  app.get("/api/uploads/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(DBService.UPLOADS_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }

      // Custom download / view route
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  // 9. Semantic search cited answer
  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Search query is required." });
      }

      const answer = await DBService.search(query);
      res.json(answer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Mount Vite / Frontend Static Server ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Listen on all interfaces
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Express server failed to start", err);
});
