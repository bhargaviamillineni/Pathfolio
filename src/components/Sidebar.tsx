import React from "react";
import { FolderKanban, Network, CalendarDays, Search, RefreshCw, Layers, Sparkles } from "lucide-react";
import { DocumentItem, RelationshipEdge } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  documents: DocumentItem[];
  relationships: RelationshipEdge[];
  onReset: () => void;
  isResetting: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, documents, relationships, onReset, isResetting }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "My Portfolio", icon: FolderKanban, desc: "Ingest & manage assets" },
    { id: "graph", label: "Interactive Skill Map", icon: Network, desc: "Visual semantic pathways" },
    { id: "timeline", label: "Academic Timeline", icon: CalendarDays, desc: "Chronological achievements" },
    { id: "search", label: "Smart Search", icon: Search, desc: "Semantic cited AI search" }
  ];

  const totalDocs = documents.length;
  const completedDocs = documents.filter(d => d.status === "completed").length;
  const categoriesCount = new Set(documents.map(d => d.metadata?.category).filter(Boolean)).size;
  const techSkillsCount = new Set(documents.flatMap(d => d.metadata?.technologies || [])).size;

  return (
    <div className="w-72 border-r border-slate-100 bg-white h-screen flex flex-col justify-between shadow-[4px_0_24px_rgba(0,0,0,0.015)] select-none shrink-0" id="sidebar-root">
      {/* Brand Identification */}
      <div className="p-8">
        <div className="flex items-center gap-3.5" id="sidebar-logo">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/20 relative overflow-hidden">
            <span className="relative z-10 font-mono tracking-tighter">P</span>
            <div className="absolute inset-0 bg-white/10 opacity-30 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="font-extrabold text-slate-900 text-lg tracking-tight leading-none">Pathfolio</h1>
              <Sparkles className="h-3 w-3 text-indigo-500 shrink-0" />
            </div>
            <span className="text-[10px] text-indigo-600 font-bold tracking-widest uppercase font-mono mt-1.5 block">
              Skill Mapping Hub
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Options */}
        <nav className="mt-10 space-y-2" id="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-start gap-3.5 px-4 py-3 rounded-xl text-left transition-all duration-250 relative group ${
                  isActive
                    ? "bg-indigo-50/70 text-indigo-950 shadow-xs"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-md" />
                )}
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                  isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold tracking-tight ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium leading-none">
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modern High-Impact Metrics Panel */}
      <div className="px-8 py-5 border-t border-slate-50 bg-gradient-to-b from-white to-slate-50/50 flex-1 overflow-y-auto max-h-[38vh]" id="sidebar-metrics">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Portfolio Summary
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-colors">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Documents</span>
            <span className="text-slate-800 font-extrabold text-sm leading-tight mt-1.5 block font-mono">
              {completedDocs} <span className="text-[10px] text-slate-400 font-normal">/ {totalDocs}</span>
            </span>
          </div>
          
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-colors">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Categories</span>
            <span className="text-slate-800 font-extrabold text-sm leading-tight mt-1.5 block font-mono">
              {categoriesCount}
            </span>
          </div>
          
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-colors">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Unique Skills</span>
            <span className="text-slate-800 font-extrabold text-sm leading-tight mt-1.5 block font-mono text-indigo-600">
              {techSkillsCount}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-colors">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Connections</span>
            <span className="text-emerald-600 font-extrabold text-sm leading-tight mt-1.5 block font-mono">
              {relationships.length} <span className="text-[9px] text-slate-400 font-normal">links</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar Reset Footer */}
      <div className="p-8 border-t border-slate-100 bg-white" id="sidebar-footer">
        <button
          onClick={onReset}
          disabled={isResetting}
          id="btn-reset-db"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin text-indigo-600" : "text-slate-400"}`} />
          Reset Portfolio Data
        </button>
      </div>
    </div>
  );
}
