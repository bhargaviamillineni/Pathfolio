import React, { useState } from "react";
import { Search, Sparkles, Award, FileDown, BookOpen, AlertCircle, HelpCircle } from "lucide-react";
import { SearchAnswer, DocumentItem } from "../types";

interface SmartSearchProps {
  documents: DocumentItem[];
}

export default function SmartSearch({ documents }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchAnswer | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const suggestedQueries = [
    "AWS cloud practitioner certificate and topics covered",
    "What technologies did John use to deploy his analytics dashboard?",
    "Describe John Doe's tasks during his TechCorp internship"
  ];

  const handleSearchSubmit = async (e: React.FormEvent, selectedQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = selectedQuery || query;
    if (!activeQuery) return;

    setQuery(activeQuery);
    setIsSearching(true);
    setErrorMsg("");
    setSearchResult(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to query semantic database.");
      }

      setSearchResult(data);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  // Custom regex formatter to parse basic markdown and render [1] or [2] as interactive clickable citation badges
  const renderFormattedAnswer = (text: string) => {
    if (!text) return null;

    // Split text into paragraphs
    const paragraphs = text.split("\n\n");

    return paragraphs.map((para, pIdx) => {
      // Basic formatting helpers for bullet items
      const isBullet = para.trim().startsWith("-") || para.trim().startsWith("*");
      
      let processedText = para;
      if (isBullet) {
        processedText = processedText.replace(/^[-*]\s+/, "");
      }

      // 1. Process Bold text (**text**)
      const parts = processedText.split(/\*\*([\s\S]*?)\*\*/g);
      
      const elements = parts.map((part, partIdx) => {
        // Even indices are plain text, odd indices are bold text
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} className="font-bold text-slate-900">{part}</strong>;
        }

        // 2. Process citations e.g. [1] or [2] within the text segment
        const subParts = part.split(/(\[\d+\])/g);
        return subParts.map((sub, subIdx) => {
          const isCitation = /^\[\d+\]$/.test(sub);
          if (isCitation) {
            const indexStr = sub.slice(1, -1);
            return (
              <span 
                key={subIdx} 
                className="mx-1 inline-flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-extrabold font-mono px-2 py-0.5 cursor-pointer shadow-2xs hover:bg-indigo-100 hover:text-indigo-900 transition-all active:scale-95"
                title={`Click to scroll to Cited Reference Document [${indexStr}]`}
                onClick={() => {
                  const citationObj = searchResult?.citations?.find(c => c.indexNumber === parseInt(indexStr));
                  if (citationObj) {
                    const el = document.getElementById(`citation-card-${citationObj.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("ring-2", "ring-indigo-500", "scale-[1.02]", "bg-indigo-50/20");
                      setTimeout(() => {
                        el.classList.remove("ring-2", "ring-indigo-500", "scale-[1.02]", "bg-indigo-50/20");
                      }, 2500);
                    }
                  }
                }}
              >
                {indexStr}
              </span>
            );
          }
          return sub;
        });
      });

      if (isBullet) {
        return (
          <li key={pIdx} className="text-xs text-slate-600 leading-relaxed list-disc ml-5 mb-2 font-normal">
            {elements}
          </li>
        );
      }

      return (
        <p key={pIdx} className="text-xs text-slate-600 leading-relaxed mb-3.5 font-normal">
          {elements}
        </p>
      );
    });
  };

  // Find the actual document detail matching the cited ID or index
  const getCitedDocument = (id: string) => {
    return documents.find(d => d.id === id);
  };

  return (
    <div className="space-y-8" id="smart-search-root">
      {/* 1. Search Box container */}
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 tracking-wide flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
            Smart Portfolio Search
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">Ask questions about your skills, experiences, and achievements to find answers grounded in your uploaded documents instantly.</p>
        </div>

        {/* Query Input */}
        <form onSubmit={(e) => handleSearchSubmit(e)} className="flex flex-col sm:flex-row items-stretch gap-3" id="search-form-input">
          <div className="flex-1 flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 hover:bg-white focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <Search className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Describe credentials John Doe acquired..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-hidden placeholder:text-slate-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query}
            id="btn-submit-search"
            className="bg-indigo-600 text-white rounded-2xl px-6 py-3 text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-indigo-500/10 shrink-0 cursor-pointer"
          >
            {isSearching ? "Searching..." : "Ask AI"}
          </button>
        </form>

        {/* Suggested presets */}
        <div className="space-y-3 pt-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Suggested Questions
          </h4>
          <div className="flex flex-col gap-2" id="suggested-queries-list">
            {suggestedQueries.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => handleSearchSubmit(e, q)}
                className="w-full text-left bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 hover:text-indigo-950 transition-all cursor-pointer flex items-center justify-between"
              >
                <span>{q}</span>
                <span className="text-[9px] bg-white border border-slate-200/50 text-slate-400 font-bold px-2 py-0.5 rounded-md uppercase font-mono group-hover:border-indigo-200 group-hover:text-indigo-600 shrink-0">Preset</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700 text-xs flex gap-2 items-start" id="search-error-state">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-600" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Loading State with animated core indicators */}
      {isSearching && (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4 shadow-2xs" id="search-loading-state">
          <div className="h-10 w-10 mx-auto text-indigo-500 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-800">Searching your portfolio...</p>
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              Searching your resumes, projects, and certificates to synthesize an accurate, cited answer.
            </p>
          </div>
        </div>
      )}

      {/* 2. Results Block */}
      {searchResult && (
        <div className="space-y-6" id="search-results-block">
          {/* Main Answer Area */}
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
              AI Portfolio Answer
            </h3>
            
            <div className="prose prose-slate max-w-none text-slate-700" id="ai-answer-paragraphs">
              {renderFormattedAnswer(searchResult.answer)}
            </div>
          </div>

          {/* Sourced References Grid */}
          <div className="space-y-4" id="citations-grid-container">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-slate-400" />
              Sourced Credentials ({searchResult.citations.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResult.citations.map((citation, i) => {
                const doc = getCitedDocument(citation.documentId);
                return (
                  <div 
                    key={citation.id} 
                    id={`citation-card-${citation.id}`}
                    className="bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge identifier */}
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <span className="h-5.5 w-5.5 rounded-lg bg-indigo-50 border border-indigo-100/60 font-mono text-xs font-bold text-indigo-700 flex items-center justify-center">
                          {citation.indexNumber}
                        </span>
                        <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md uppercase font-mono tracking-wider">
                          Score: {(citation.score * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Excerpt */}
                      <p className="text-[11px] text-slate-500 italic leading-relaxed pl-3.5 border-l border-slate-200 mb-4">
                        "...{citation.excerpt}..."
                      </p>
                    </div>

                    {doc && (
                      <div className="pt-3.5 border-t border-slate-50/80 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-700 truncate pr-4">
                          {doc.metadata?.title || doc.originalName}
                        </span>
                        
                        {doc.sourceUrl ? (
                          <a 
                            href={doc.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 hover:text-indigo-800 shrink-0"
                          >
                            Source Link
                          </a>
                        ) : (
                          <a 
                            href={`/api/uploads/${doc.filename}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 hover:text-indigo-800 shrink-0"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
