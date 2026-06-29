import React from "react";
import { FileText, Image, Globe, RefreshCw, AlertTriangle, ExternalLink, Trash2, Calendar, Award, CheckCircle2 } from "lucide-react";
import { DocumentItem } from "../types";

interface DocumentListProps {
  documents: DocumentItem[];
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  isDeletingId: string | null;
}

export default function DocumentList({ documents, onDelete, onRetry, isDeletingId }: DocumentListProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="h-4.5 w-4.5 text-rose-500" />;
    if (mimeType.includes("word") || mimeType.includes("docx")) return <FileText className="h-4.5 w-4.5 text-blue-500" />;
    if (mimeType.includes("image")) return <Image className="h-4.5 w-4.5 text-emerald-500" />;
    return <Globe className="h-4.5 w-4.5 text-indigo-500" />;
  };

  const getCategoryColor = (category: string = "") => {
    switch (category.toLowerCase()) {
      case "resume": return "bg-purple-50 text-purple-700 border-purple-200/50";
      case "certificate": return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "project report": return "bg-indigo-50 text-indigo-700 border-indigo-200/50";
      case "internship letter": return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      case "coursework": return "bg-rose-50 text-rose-700 border-rose-200/50";
      case "portfolio link": return "bg-sky-50 text-sky-700 border-sky-200/50";
      default: return "bg-slate-50 text-slate-700 border-slate-200/50";
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = bytes / 1024;
    if (k > 1024) return `${(k / 1024).toFixed(1)} MB`;
    return `${k.toFixed(0)} KB`;
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400" id="docs-empty-state">
        <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100/60">
          <FileText className="h-6 w-6 text-slate-400" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No documents in workspace yet</h4>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          Upload certificates, internship letters, or paste web portfolios above to see real-time AI organization.
        </p>
      </div>
    );
  }

  const sortedDocs = [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4" id="document-list-root">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
          Workspace Documents ({documents.length})
        </h3>
        <span className="text-[10px] text-slate-400 font-semibold font-mono">Sort: Newest First</span>
      </div>

      <div className="grid grid-cols-1 gap-4.5" id="document-cards-grid">
        {sortedDocs.map((doc) => {
          const isProcessing = doc.status === "processing";
          const isFailed = doc.status === "failed";
          const metadata = doc.metadata;

          return (
            <div
              key={doc.id}
              id={`doc-card-${doc.id}`}
              className={`bg-white rounded-2xl border p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative group ${
                isProcessing
                  ? "border-amber-200 bg-amber-50/10 animate-pulse"
                  : isFailed
                  ? "border-rose-100 bg-rose-50/10"
                  : "border-slate-100/80 hover:border-slate-200"
              }`}
            >
              {/* Header section (original filename & status / delete button) */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs leading-snug break-all">
                      {doc.originalName}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono font-medium">
                      {formatSize(doc.fileSize)} • Ingested {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badges */}
                  {isProcessing && (
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-700 bg-amber-100/50 px-2.5 py-1 rounded-full border border-amber-200/60 uppercase tracking-wider font-mono">
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                      Analyzing...
                    </span>
                  )}
                  {isFailed && (
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-700 bg-rose-100/50 px-2.5 py-1 rounded-full border border-rose-200/60 uppercase tracking-wider font-mono">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Failed
                    </span>
                  )}
                  {!isProcessing && !isFailed && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100/40 px-2 py-0.5 rounded-full border border-emerald-200/30">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Parsed
                    </span>
                  )}
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(doc.id)}
                    disabled={isDeletingId === doc.id}
                    id={`btn-delete-${doc.id}`}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    title="Delete document and re-index graph"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Error block if failed */}
              {isFailed && (
                <div className="mt-4 p-3 bg-rose-50/60 border border-rose-100 text-rose-700 rounded-xl text-[10px] leading-relaxed font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <strong>Extraction Failure:</strong> {doc.error || "Temporary service unavailability. Please try again."}
                  </div>
                  <button
                    onClick={() => onRetry(doc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer hover:shadow-sm shrink-0 uppercase tracking-wider text-[9px] font-mono self-start sm:self-center"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry Ingestion
                  </button>
                </div>
              )}

              {/* Complete Metadata AI Organization Block */}
              {!isProcessing && !isFailed && metadata && (
                <div className="mt-5 pt-5 border-t border-slate-50 space-y-4" id={`doc-metadata-${doc.id}`}>
                  {/* Title & Organization */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-mono ${getCategoryColor(metadata.category)}`}>
                      {metadata.category || "Uncategorized"}
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-xs tracking-tight">
                      {metadata.title}
                    </h5>
                  </div>

                  {/* Date & Issuer */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {metadata.issuingOrg || "Unknown Issuer"}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {metadata.date || "No Date"}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {metadata.summary}
                  </p>

                  {/* Technologies extracted */}
                  {metadata.technologies && metadata.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {metadata.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 text-[9px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-default"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confidence progress and Download */}
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    {/* Confidence percentage bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Confidence:</span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(metadata.confidence * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600 font-extrabold font-mono">
                        {(metadata.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* View Original File Link */}
                    {doc.sourceUrl ? (
                      <a
                        href={doc.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline transition-colors"
                      >
                        Visit Source <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <a
                        href={`/api/uploads/${doc.filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline transition-colors"
                      >
                        Original Resource <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
