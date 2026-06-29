export interface DocumentMetadata {
  category: string;
  title: string;
  issuingOrg: string;
  date: string; // ISO format or YYYY-MM-DD
  technologies: string[];
  summary: string;
  confidence: number;
}

export interface DocumentItem {
  id: string;
  filename: string;
  mimeType: string;
  originalName: string;
  text: string;
  metadata?: DocumentMetadata;
  embedding?: number[];
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  fileSize?: number;
  sourceUrl?: string; // If ingested via link
}

export interface RelationshipEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'SEMANTICALLY_RELATED' | 'LLM_PROPOSED';
  reason: string;
  score?: number; // cosine similarity score or weight
}

export interface CitationItem {
  id: string;
  indexNumber: number;
  score: number;
  excerpt: string;
  documentId: string;
}

export interface SearchAnswer {
  query: string;
  answer: string;
  citedDocIds: string[];
  citations: CitationItem[];
}

export interface DBState {
  documents: DocumentItem[];
  relationships: RelationshipEdge[];
  timelineNarrative: string;
}
