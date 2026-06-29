import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { DBState, DocumentItem, DocumentMetadata, RelationshipEdge, SearchAnswer } from "./types";

let DATA_DIR = process.cwd();
if (fs.existsSync("/data")) {
  try {
    const testFile = path.join("/data", ".write_test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    DATA_DIR = "/data";
  } catch (err) {
    console.warn("WARNING: /data exists but is not writable. Falling back to process.cwd()", err);
  }
}

export const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Initialize uploads dir if not exists
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

// Lazy initialization of Gemini
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not configured. Running in demo fallback mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Helper for Cosine Similarity
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Normalize vectors helper
const normalizeVector = (v: number[]) => {
  const mag = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  return mag === 0 ? v : v.map(val => val / mag);
};

// Robust exponential backoff retry helper for Gemini API calls to handle transient 503 / 429 / UNAVAILABLE errors
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const errMsg = String(err?.message || err || "").toLowerCase();
    const isTransient = 
      errMsg.includes("503") ||
      errMsg.includes("429") ||
      errMsg.includes("unavailable") ||
      errMsg.includes("resource_exhausted") ||
      errMsg.includes("high demand") ||
      errMsg.includes("temporarily") ||
      errMsg.includes("timeout") ||
      errMsg.includes("504") ||
      errMsg.includes("502");

    if (isTransient && retries > 0) {
      console.log(`[Gemini Auto-Retry] Service busy. Re-attempting in ${delay}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Multi-model fallback logic for robust content generation under high load conditions
async function generateContentWithFallback(ai: any, params: any, retries = 3, delay = 1000): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    let attempts = retries;
    let currentDelay = delay;
    
    while (attempts >= 0) {
      try {
        console.log(`[Gemini API] Requesting content generation using model: ${model}`);
        const response = await ai.models.generateContent({
          ...params,
          model: model
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "").toLowerCase();
        const isTransient = 
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("high demand") ||
          errMsg.includes("temporarily") ||
          errMsg.includes("timeout") ||
          errMsg.includes("504") ||
          errMsg.includes("502");

        if (isTransient && attempts > 0) {
          console.log(`[Gemini Auto-Retry] Service busy on ${model}. Re-attempting in ${currentDelay}ms... (${attempts} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          attempts--;
          currentDelay *= 2;
        } else {
          console.log(`[Gemini Fallback] Model ${model} busy. Trying next fallback model...`);
          break;
        }
      }
    }
  }
  
  throw lastError || new Error("All Gemini generation options are currently busy. Please wait a moment and try again.");
}

// Multi-model fallback logic for robust embedding generation under high load conditions
async function embedContentWithFallback(ai: any, params: any, retries = 3, delay = 1000): Promise<any> {
  const models = ["gemini-embedding-2-preview", "text-embedding-004"];
  let lastError: any = null;

  for (const model of models) {
    let attempts = retries;
    let currentDelay = delay;
    
    while (attempts >= 0) {
      try {
        console.log(`[Gemini API] Requesting embedding using model: ${model}`);
        const response = await ai.models.embedContent({
          ...params,
          model: model
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "").toLowerCase();
        const isTransient = 
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("high demand") ||
          errMsg.includes("temporarily") ||
          errMsg.includes("timeout") ||
          errMsg.includes("504") ||
          errMsg.includes("502");

        if (isTransient && attempts > 0) {
          console.log(`[Gemini Auto-Retry] Embedding busy on ${model}. Re-attempting in ${currentDelay}ms... (${attempts} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          attempts--;
          currentDelay *= 2;
        } else {
          console.log(`[Gemini Fallback] Embedding model ${model} busy. Trying next fallback embedding model...`);
          break;
        }
      }
    }
  }
  
  throw lastError || new Error("All Gemini embedding options are currently busy. Please wait a moment and try again.");
}

const getInitialState = (): DBState => {
  return {
    documents: [],
    relationships: [],
    timelineNarrative: ""
  };
};

// Database Service Class
export class DBService {
  static readonly DB_FILE = DB_FILE;
  static readonly UPLOADS_DIR = UPLOADS_DIR;

  static loadSeedData(): DBState {
    try {
      const seedFile = path.join(process.cwd(), "db_seed.json");
      if (fs.existsSync(seedFile)) {
        const seedData = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
        this.write(seedData);
        return seedData;
      }
    } catch (error) {
      console.error("Failed to load seed data", error);
    }
    return this.read();
  }

  static read(): DBState {
    try {
      if (!fs.existsSync(DB_FILE)) {
        const initState = getInitialState();
        fs.writeFileSync(DB_FILE, JSON.stringify(initState, null, 2));
        return initState;
      }
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      // Ensure all arrays exist
      return {
        documents: parsed.documents || [],
        relationships: parsed.relationships || [],
        timelineNarrative: parsed.timelineNarrative || ""
      };
    } catch (error) {
      console.error("Failed to read database, returning initial state", error);
      return getInitialState();
    }
  }

  static write(state: DBState): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error("Failed to write to database", error);
      throw new Error(`Failed to write to database: ${(error as Error).message}`);
    }
  }

  // Generate real embedding for text using gemini-embedding-2-preview
  static async getEmbedding(text: string): Promise<number[]> {
    const ai = getGeminiClient();
    if (!ai) {
      // Fallback: Generate a pseudo-random normalized vector based on character hashes
      console.log("No Gemini client, generating pseudo-embedding vector");
      const vec = Array.from({ length: 768 }, (_, i) => {
        let hash = 0;
        for (let c = 0; c < text.length; c++) {
          hash = (hash << 5) - hash + text.charCodeAt(c) + i;
          hash |= 0;
        }
        return Math.sin(hash) * 0.5 + 0.5;
      });
      return normalizeVector(vec);
    }

    try {
      const response = await embedContentWithFallback(ai, {
        contents: text.slice(0, 8000), // Safety limit for single embedding call
      });
      const res = response as any;
      const embeddingObj = res.embedding || res.embeddings;
      if (embeddingObj?.values) {
        return embeddingObj.values;
      }
      throw new Error("No embedding values returned from Gemini API");
    } catch (err) {
      console.error("Error fetching real embedding, falling back:", err);
      // Basic fallback
      const vec = Array.from({ length: 768 }, (_, i) => Math.sin(i * text.length));
      return normalizeVector(vec);
    }
  }

  // Extract text based on file format
  static async extractText(filePath: string, mimeType: string, originalName: string): Promise<string> {
    const ext = path.extname(originalName).toLowerCase();
    
    // Direct plain text / markdown / JSON / CSV extraction
    if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv" || ext === ".xml" || mimeType.startsWith("text/")) {
      try {
        console.log(`[Text Extractor] Directly reading text file: ${originalName}`);
        return fs.readFileSync(filePath, "utf-8");
      } catch (err) {
        console.error(`Failed to read text file ${originalName}`, err);
        throw new Error("Text file reading failed");
      }
    }

    // DOCX processing
    if (ext === ".docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value || "";
      } catch (err) {
        console.error("Failed to parse Word docx", err);
        throw new Error("Word document extraction failed");
      }
    }

    // PDF / Images / Links
    const ai = getGeminiClient();
    if (!ai) {
      // Offline fallback: Use the file name or a mock extracted text
      return `[OFFLINE MODE Fallback] Extracted text from ${originalName}. Contains credentials, certifications, or projects related to cloud engineering, web development, and software design. Created on ${new Date().toISOString().split("T")[0]}.`;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const base64Data = buffer.toString("base64");
      
      let prompt = "Extract all readable text, items, details, organizations, dates, and technologies from this document verbatim. Preserve the semantic structure.";
      
      const response = await generateContentWithFallback(ai, {
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          prompt
        ]
      });

      return response.text || "";
    } catch (err) {
      console.error(`Gemini extraction failed for ${originalName}`, err);
      throw err;
    }
  }

  // Extract text from web URL link
  static async extractTextFromLink(url: string): Promise<{ text: string; title: string }> {
    try {
      // Native Node fetch
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = await res.text();

      // Clean HTML helper using simple regexes
      let text = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Simple Title extractor
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;

      const ai = getGeminiClient();
      if (ai) {
        // Send to Gemini to extract main content elegantly
        const response = await generateContentWithFallback(ai, {
          contents: `Given the raw web page content below, clean it up and extract only the relevant professional/academic project details, portfolio descriptions, resumes, or letters. Ignore footers, navigation, or cookie notices.\n\nContent:\n${text.slice(0, 6000)}`
        });
        text = response.text || text;
      }

      return { text, title };
    } catch (err) {
      console.error("Failed to extract text from URL:", err);
      throw new Error(`Failed to ingest web link: ${(err as Error).message}`);
    }
  }

  // Categorization
  static async categorizeDocument(text: string): Promise<DocumentMetadata> {
    const ai = getGeminiClient();
    if (!ai) {
      // Fallback categorization
      return {
        category: "Other",
        title: "Extracted Document",
        issuingOrg: "Unknown",
        date: new Date().toISOString().split("T")[0],
        technologies: [],
        summary: "This document was parsed in demo mode because the Gemini API Key is not configured.",
        confidence: 0.5
      };
    }

    try {
      const slicedText = (text || "").trim().slice(0, 25000);
      const response = await generateContentWithFallback(ai, {
        contents: `Analyze the following professional/educational document text. Categorize it and extract key details in JSON format.\n\nDocument Text:\n${slicedText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "Choose exactly one: 'Resume', 'Certificate', 'Project Report', 'Internship Letter', 'Coursework', 'Portfolio Link', or 'Other'"
              },
              title: { type: Type.STRING, description: "Official concise title of the document, certificate, resume, or project" },
              issuing_org: { type: Type.STRING, description: "Issuing organization, university, company, or 'Personal Project'" },
              date: { type: Type.STRING, description: "Extracted completion, issue, or graduation date (YYYY-MM-DD or YYYY-MM or YYYY)" },
              technologies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of tech skills, programming languages, databases, framework, or core concepts found (e.g. ['React', 'Python'])"
              },
              summary: { type: Type.STRING, description: "A highly clear 2-3 sentence overview of what this document proves, covers, or certifies." },
              confidence: { type: Type.NUMBER, description: "Your categorization confidence score from 0.00 to 1.00" }
            },
            required: ["category", "title", "issuing_org", "date", "technologies", "summary", "confidence"]
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      return {
        category: result.category,
        title: result.title,
        issuingOrg: result.issuing_org,
        date: result.date,
        technologies: result.technologies || [],
        summary: result.summary,
        confidence: result.confidence
      };
    } catch (err) {
      console.error("Categorization failed, falling back to heuristics:", err);
      return {
        category: "Other",
        title: "Heuristically Parsed Document",
        issuingOrg: "Unidentified",
        date: new Date().toISOString().split("T")[0],
        technologies: [],
        summary: "Document text parsed. Metadata categorization fell back due to JSON API processing interruption.",
        confidence: 0.6
      };
    }
  }

  // Compute Relationships (LLM Proposed + Embedding similarity)
  static async computeRelationships(newDoc: DocumentItem): Promise<RelationshipEdge[]> {
    const db = this.read();
    const otherDocs = db.documents.filter(d => d.id !== newDoc.id && d.status === "completed");
    const newEdges: RelationshipEdge[] = [];

    if (!newDoc.embedding) return [];

    // 1. Embedding cosine similarity (threshold > 0.78)
    for (const other of otherDocs) {
      if (other.embedding) {
        const similarity = cosineSimilarity(newDoc.embedding, other.embedding);
        if (similarity > 0.78) {
          newEdges.push({
            id: `rel_embed_${newDoc.id}_${other.id}`,
            sourceId: newDoc.id,
            targetId: other.id,
            type: "SEMANTICALLY_RELATED",
            reason: `Semantic similarity score of ${(similarity * 100).toFixed(0)}% found in document context, matching key engineering terminology, structures, or methodologies.`,
            score: parseFloat(similarity.toFixed(3))
          });
        }
      }
    }

    // 2. LLM Propose relationships (pass existing entities)
    const ai = getGeminiClient();
    if (ai && otherDocs.length > 0) {
      try {
        // Collect existing entities
        const existingEntities = Array.from(new Set(
          otherDocs.flatMap(d => [
            d.metadata?.title || "",
            d.metadata?.issuingOrg || "",
            ...(d.metadata?.technologies || [])
          ]).filter(Boolean)
        )).slice(0, 50); // limit to avoid token bloat

        const documentListText = otherDocs.map(d => `- ID: ${d.id}, Title: "${d.metadata?.title}", Category: "${d.metadata?.category}", Technologies: [${d.metadata?.technologies?.join(", ")}]`).join("\n");

        const prompt = `You are a Knowledge Graph designer. We have a new document we just ingested:
New Document:
- ID: ${newDoc.id}
- Title: "${newDoc.metadata?.title}"
- Category: "${newDoc.metadata?.category}"
- Technologies: [${newDoc.metadata?.technologies?.join(", ")}]
- Summary: "${newDoc.metadata?.summary}"

Existing Library of Documents:
${documentListText}

Known Entity Names in the System:
[${existingEntities.join(", ")}]

Compare the new document with the existing library. Propose up to 2 logical relationships if they connect in a professional/educational way (e.g., a Certificate verifies a technology used in a Project Report, or an Internship Letter verifies work done on a certain topic). Reuse existing entity names if applicable to avoid duplicate nodes.

Return your response in JSON format.`;

        const response = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  target_document_id: { type: Type.STRING, description: "The ID of the existing document from the provided list" },
                  relationship_type: { type: Type.STRING, description: "A standard uppercase relationship label, e.g. 'VERIFIES_SKILL', 'ISSUED_FOR_PROJECT', 'EXPANDS_EXPERIENCE', 'ACADEMIC_CREDIT', 'USES_INFRASTRUCTURE'" },
                  reason: { type: Type.STRING, description: "A detailed 1-sentence justification explaining how the new document and target document connect." }
                },
                required: ["target_document_id", "relationship_type", "reason"]
              }
            }
          }
        });

        const proposed = JSON.parse(response.text.trim());
        for (const rel of proposed) {
          // Verify target exists
          if (otherDocs.some(d => d.id === rel.target_document_id)) {
            newEdges.push({
              id: `rel_llm_${newDoc.id}_${rel.target_document_id}`,
              sourceId: newDoc.id,
              targetId: rel.target_document_id,
              type: "LLM_PROPOSED",
              reason: rel.reason
            });
          }
        }
      } catch (err) {
        console.error("LLM relationship extraction failed", err);
      }
    }

    return newEdges;
  }

  // Generate Narrative Timeline
  static async updateTimelineNarrative(): Promise<string> {
    const db = this.read();
    const completedDocs = db.documents.filter(d => d.status === "completed" && d.metadata);
    if (completedDocs.length === 0) return "";

    const ai = getGeminiClient();
    if (!ai) {
      return db.timelineNarrative; // fallback/cache
    }

    try {
      const docListSummary = completedDocs.map(d => {
        const meta = d.metadata!;
        return `- Title: "${meta.title}", Date: "${meta.date}", Category: "${meta.category}", Issuing Org: "${meta.issuingOrg}", Summary: "${meta.summary}", Techs: [${meta.technologies.join(", ")}]`;
      }).join("\n");

      const prompt = `You are an expert biographer and career coach. Based ONLY on the actual verified academic and professional accomplishments below, generate a smooth, chronological, inspirational 1-paragraph narrative (maximum 4-5 sentences) summarizing this student's career growth, skill specialization, and timelines. Highlight how their certifications connect to their projects or internships. DO NOT hallucinate any dates, titles, or events not present below.

Accomplishments:
${docListSummary}`;

      const response = await generateContentWithFallback(ai, {
        contents: prompt
      });

      const narrative = response.text || "";
      db.timelineNarrative = narrative;
      this.write(db);
      return narrative;
    } catch (err) {
      console.error("Failed to update timeline narrative", err);
      return db.timelineNarrative;
    }
  }

  // Smart cited search
  static async search(query: string): Promise<SearchAnswer> {
    const db = this.read();
    const completedDocs = db.documents.filter(d => d.status === "completed");
    if (completedDocs.length === 0) {
      return {
        query,
        answer: "There are no documents ingested in the system yet. Please upload files to search.",
        citedDocIds: [],
        citations: []
      };
    }

    // Dynamic on-demand embedding generation for seeded documents that lack embeddings
    let dbStateChanged = false;
    for (const doc of completedDocs) {
      if (!doc.embedding) {
        try {
          console.log(`[Smart Search] Generating missing embedding on-the-fly for: ${doc.originalName}`);
          doc.embedding = await this.getEmbedding(doc.text || "");
          dbStateChanged = true;
        } catch (err) {
          console.error(`Failed to generate on-the-fly embedding for ${doc.originalName}`, err);
        }
      }
    }
    if (dbStateChanged) {
      this.write(db);
    }

    // Embed the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.getEmbedding(query);
    } catch (err) {
      console.warn("[Smart Search] Failed to get real query embedding, using 768-dim hash-fallback instead.");
      const vec = Array.from({ length: 768 }, (_, i) => Math.sin(i * query.length));
      queryEmbedding = normalizeVector(vec);
    }

    // Helper for keyword-based similarity fallback to make finding extremely precise
    const computeKeywordScore = (q: string, text: string, metadata: any): number => {
      const qWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (qWords.length === 0) return 0;
      const docContent = `${text} ${metadata?.title || ""} ${metadata?.category || ""} ${metadata?.issuingOrg || ""} ${(metadata?.technologies || []).join(" ")}`.toLowerCase();
      let matches = 0;
      for (const word of qWords) {
        if (docContent.includes(word)) {
          matches += 1.5; // Weight direct exact match
        }
      }
      return matches / qWords.length;
    };

    // Rank documents by combining semantic similarity and keyword relevance
    const ranked = completedDocs.map(doc => {
      const semanticSim = doc.embedding ? cosineSimilarity(queryEmbedding, doc.embedding) : 0;
      const keywordSim = computeKeywordScore(query, doc.text || "", doc.metadata);
      // Combine scores: 60% semantic similarity + 40% keyword match
      const similarity = semanticSim * 0.6 + keywordSim * 0.4;
      return { doc, similarity, semanticSim, keywordSim };
    }).sort((a, b) => b.similarity - a.similarity);

    // Get top 3 matches with relaxed threshold so relevant keyword results are never blanked out
    const topMatches = ranked.slice(0, 3).filter(r => r.similarity > 0.05);
    if (topMatches.length === 0) {
      return {
        query,
        answer: "I couldn't find any documents semantically or textually related to your query. Try searching for specific technologies like AWS, React, or certificates/internships.",
        citedDocIds: [],
        citations: []
      };
    }

    const citations = topMatches.map((m, index) => {
      const excerpt = m.doc.metadata?.summary || (m.doc.text ? m.doc.text.slice(0, 180).trim() + "..." : "No content preview available");
      return {
        id: `cite_${m.doc.id}_${index}`,
        indexNumber: index + 1,
        score: m.similarity || 0.85,
        excerpt: excerpt,
        documentId: m.doc.id
      };
    });

    const ai = getGeminiClient();
    if (!ai) {
      // Offline fallback cited response
      const answer = `[DEMO MODE Search Answer] Semantically searching for "${query}". Top documents found on your system:\n\n` +
        topMatches.map((m, i) => `${i+1}. **${m.doc.metadata?.title}** (Confidence: ${(m.similarity * 100).toFixed(0)}%)\n   *Summary:* ${m.doc.metadata?.summary}\n`).join("\n") +
        `\nConfigure your GEMINI_API_KEY to generate deep generative answers with proper numerical citations grounded in these documents.`;
      return {
        query,
        answer,
        citedDocIds: topMatches.map(m => m.doc.id),
        citations
      };
    }

    try {
      const docContext = topMatches.map((m, index) => {
        return `[Document ID: ${m.doc.id}]
Index Number: [${index + 1}]
Title: "${m.doc.metadata?.title}"
Category: "${m.doc.metadata?.category}"
Issuing Organization: "${m.doc.metadata?.issuingOrg}"
Date: "${m.doc.metadata?.date}"
Content:\n${m.doc.text.slice(0, 4000)}`;
      }).join("\n\n---\n\n");

      const prompt = `You are an AI assistant powered by a Pathfolio Knowledge Graph. Answer the user's search query comprehensively, using ONLY the facts and document excerpts provided below.
Provide a clear, cohesive professional answer with Markdown formatting.
Whenever you state a fact or detail from a document, immediately follow it with a numerical citation linking to the document's Index Number, such as [1] or [2].
Do not state anything that is not directly supported by the documents.

User Query: "${query}"

Documents Context:
${docContext}

Return your output in a clean JSON object with the following schema:
{
  "answer": "Cohesive response text containing Markdown and numerical citations (e.g., [1] or [2])",
  "cited_document_ids": ["array of exact Document IDs corresponding to the cited documents"]
}`;

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING, description: "Answer text with markdown and citation brackets like [1]" },
              cited_document_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "The list of original document IDs cited in the answer"
              }
            },
            required: ["answer", "cited_document_ids"]
          }
        }
      });

      const parsed = JSON.parse(response.text.trim());
      const actualCitedDocIds = parsed.cited_document_ids && parsed.cited_document_ids.length > 0 
        ? parsed.cited_document_ids 
        : topMatches.map(m => m.doc.id);

      return {
        query,
        answer: parsed.answer,
        citedDocIds: actualCitedDocIds,
        citations
      };
    } catch (err) {
      console.error("Gemini search query response failed", err);
      return {
        query,
        answer: `An error occurred while compiling your answer. However, I found these relevant documents on your timeline:\n\n` +
          topMatches.map(m => `- **${m.doc.metadata?.title}** (${m.doc.metadata?.category})`).join("\n"),
        citedDocIds: topMatches.map(m => m.doc.id),
        citations
      };
    }
  }

  // Full asynchronous ingestion pipeline
  static async ingestDocumentAsync(docId: string, filePath: string, mimeType: string, originalName: string, sourceUrl?: string): Promise<void> {
    const db = this.read();
    const docIdx = db.documents.findIndex(d => d.id === docId);
    if (docIdx === -1) return;

    try {
      console.log(`[Ingestion Pipeline] Starting for ${originalName} (ID: ${docId})`);
      
      // 1. Text extraction
      let text = "";
      if (sourceUrl) {
        const linkResult = await this.extractTextFromLink(sourceUrl);
        text = linkResult.text;
      } else {
        text = await this.extractText(filePath, mimeType, originalName);
      }

      db.documents[docIdx].text = text;
      this.write(db);

      // 2. Metadata categorization
      console.log(`[Ingestion Pipeline] Categorizing ${originalName}`);
      const metadata = await this.categorizeDocument(text);
      db.documents[docIdx].metadata = metadata;
      this.write(db);

      // 3. Generate Embedding
      console.log(`[Ingestion Pipeline] Fetching embedding for ${originalName}`);
      const embedding = await this.getEmbedding(text);
      db.documents[docIdx].embedding = embedding;
      this.write(db);

      // 4. Update status to completed
      db.documents[docIdx].status = "completed";
      this.write(db);

      // 5. Compute relations with other documents
      console.log(`[Ingestion Pipeline] Computing relationships for ${originalName}`);
      const relationships = await this.computeRelationships(db.documents[docIdx]);
      db.relationships.push(...relationships);
      this.write(db);

      // 6. Update cached timeline narrative
      console.log(`[Ingestion Pipeline] Re-generating timeline narrative`);
      await this.updateTimelineNarrative();

      console.log(`[Ingestion Pipeline] Ingestion completed successfully for ${originalName}!`);
    } catch (err) {
      console.error(`[Ingestion Pipeline] Error ingesting document ${originalName}:`, err);
      const currentDb = this.read();
      const currentDocIdx = currentDb.documents.findIndex(d => d.id === docId);
      if (currentDocIdx !== -1) {
        currentDb.documents[currentDocIdx].status = "failed";
        currentDb.documents[currentDocIdx].error = (err as Error).message;
        this.write(currentDb);
      }
    }
  }
}
