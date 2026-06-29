import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FolderKanban, Network, CalendarDays, Search, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import Sidebar from "./components/Sidebar";
import DocumentUpload from "./components/DocumentUpload";
import DocumentList from "./components/DocumentList";
import KnowledgeGraph from "./components/KnowledgeGraph";
import TimelineView from "./components/TimelineView";
import SmartSearch from "./components/SmartSearch";
import WorkspaceInsights from "./components/WorkspaceInsights";
import { DocumentItem, RelationshipEdge } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipEdge[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [timelineNarrative, setTimelineNarrative] = useState("");
  
  // App States
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState("");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Fetching
  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // Parallel requests for optimal speed
      const [docsRes, relsRes, timelineRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/relationships"),
        fetch("/api/timeline")
      ]);

      if (!docsRes.ok || !relsRes.ok || !timelineRes.ok) {
        throw new Error("One or more server requests failed.");
      }

      const docs = await docsRes.json();
      const rels = await relsRes.json();
      const timeline = await timelineRes.json();

      setDocuments(docs);
      setRelationships(rels);
      setTimelineData(timeline.timeline || []);
      setTimelineNarrative(timeline.narrative || "");
      setGlobalError("");
    } catch (err) {
      setGlobalError("Connection lost or server offline. Retrying in background...");
      console.error("Data fetch failed:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      stopPolling();
    };
  }, []);

  // Polling setup to trace asynchronous document extraction status
  const startPolling = () => {
    if (pollIntervalRef.current) return;
    console.log("[Polling] Activating background polling...");
    pollIntervalRef.current = setInterval(() => {
      fetchData(false);
    }, 4000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      console.log("[Polling] Deactivating background polling.");
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Check if any documents are actively processing, trigger polling
  useEffect(() => {
    const hasActiveProcessing = documents.some(doc => doc.status === "processing");
    if (hasActiveProcessing) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [documents]);

  // Handler for document uploaded successfully
  const handleIngestSuccess = (newDoc: any) => {
    // Instantly append doc in state with processing status so UI is interactive immediately
    setDocuments(prev => [newDoc, ...prev]);
    // Start polling automatically to fetch updates
    startPolling();
  };

  // Handler for deleting documents
  const handleDeleteDocument = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete document.");
      }
      
      // Update local state immediately
      setDocuments(prev => prev.filter(d => d.id !== id));
      setRelationships(prev => prev.filter(r => r.sourceId !== id && r.targetId !== id));
      // Refresh timeline too
      fetchData(false);
    } catch (err) {
      alert(`Delete failed: ${(err as Error).message}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Handler for retrying document ingestion
  const handleRetryDocument = async (id: string) => {
    try {
      // Set the document locally to processing state so UI is instantly responsive
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: "processing", error: undefined } : d));
      
      const res = await fetch(`/api/documents/${id}/retry`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retry document ingestion.");
      }
      
      // Start polling to trace status
      startPolling();
    } catch (err) {
      alert(`Retry failed: ${(err as Error).message}`);
      fetchData(false); // recover state
    }
  };

  // Handler for resetting seed data
  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to reset the database to initial sandbox seeds? All newly uploaded files will be permanently deleted.")) {
      return;
    }
    
    setIsResetting(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset database.");
      }

      // Update state to seed data
      setDocuments(data.state.documents || []);
      setRelationships(data.state.relationships || []);
      setTimelineNarrative(data.state.timelineNarrative || "");
      // Fetch latest grouped timeline
      fetchData(false);
      alert("Database successfully restored to pristine, certified seed records.");
    } catch (err) {
      alert(`Database Reset failed: ${(err as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-800 overflow-hidden" id="app-root">
      {/* 1. Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documents={documents}
        relationships={relationships}
        onReset={handleResetDatabase}
        isResetting={isResetting}
      />

      {/* 2. Main Workspace Panel */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden" id="main-content-panel">
        
        {/* Top bar indicators */}
        <header className="h-16 border-b border-slate-100 bg-white px-8 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase">WORKSPACE PORTAL</span>
            <span className="h-3.5 w-px bg-slate-100" />
            <h2 className="text-xs font-extrabold text-slate-800 capitalize tracking-tight flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              {activeTab === "dashboard" ? "My Academic Portfolio" : activeTab === "graph" ? "Skill Connection Map" : activeTab === "timeline" ? "Academic & Career Timeline" : "Smart Portfolio Search"}
            </h2>
          </div>

          {/* Processing and Error Banners */}
          <div className="flex items-center gap-3">
            {documents.some(d => d.status === "processing") && (
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider font-mono text-amber-700 bg-amber-50 border border-amber-200/50 px-3 py-1 rounded-full">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
                Analyzing assets...
              </span>
            )}
            {globalError && (
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider font-mono text-rose-700 bg-rose-50 border border-rose-200/50 px-3 py-1 rounded-full animate-pulse">
                <AlertCircle className="h-3 w-3 text-rose-600" />
                {globalError}
              </span>
            )}
          </div>
        </header>

        {/* Content canvas with animatable transition views */}
        <div className="flex-1 overflow-y-auto p-8 relative bg-white">
          {isLoading ? (
            <div className="absolute inset-0 bg-slate-50/60 flex flex-col items-center justify-center gap-3" id="app-loading">
              <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-600 font-mono">Loading portfolio data...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-5xl mx-auto h-full"
                id="active-view-container"
              >
                {/* Switch tab contents */}
                {activeTab === "dashboard" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 align-start" id="dashboard-tab-grid">
                    <div className="md:col-span-1 space-y-6">
                      {/* Upload and URL Ingestion section */}
                      <DocumentUpload onUploadSuccess={handleIngestSuccess} />
                      
                      {/* Dynamic Workspace Insights panel */}
                      <WorkspaceInsights
                        documents={documents}
                        relationships={relationships}
                      />
                    </div>
                    
                    {/* Document List Workspace section */}
                    <div className="md:col-span-2">
                      <DocumentList
                        documents={documents}
                        onDelete={handleDeleteDocument}
                        onRetry={handleRetryDocument}
                        isDeletingId={isDeletingId}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "graph" && (
                  <KnowledgeGraph
                    documents={documents}
                    relationships={relationships}
                  />
                )}

                {activeTab === "timeline" && (
                  <TimelineView
                    timeline={timelineData}
                    narrative={timelineNarrative}
                  />
                )}

                {activeTab === "search" && (
                  <SmartSearch
                    documents={documents}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
