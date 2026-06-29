import React from "react";
import { Layers, Award, Zap, BarChart2, Briefcase, Activity } from "lucide-react";
import { DocumentItem, RelationshipEdge } from "../types";

interface WorkspaceInsightsProps {
  documents: DocumentItem[];
  relationships: RelationshipEdge[];
}

export default function WorkspaceInsights({ documents, relationships }: WorkspaceInsightsProps) {
  const completedDocs = documents.filter((d) => d.status === "completed" && d.metadata);
  const totalCount = documents.length;
  const completedCount = completedDocs.length;
  const relationshipCount = relationships.length;

  // 1. Calculate Average Confidence
  const averageConfidence = completedCount > 0
    ? completedDocs.reduce((acc, doc) => acc + (doc.metadata?.confidence || 0), 0) / completedCount
    : 0;

  // 2. Extract Top Technologies / Skills
  const techFrequency: { [key: string]: number } = {};
  completedDocs.forEach((doc) => {
    if (doc.metadata?.technologies) {
      doc.metadata.technologies.forEach((tech) => {
        const trimmed = tech.trim();
        if (trimmed) {
          techFrequency[trimmed] = (techFrequency[trimmed] || 0) + 1;
        }
      });
    }
  });

  const sortedTech = Object.entries(techFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5 technologies

  // 3. Document Category Breakdown
  const categoryCounts: { [key: string]: number } = {
    "resume": 0,
    "certificate": 0,
    "project report": 0,
    "internship letter": 0,
    "coursework": 0,
    "portfolio link": 0,
  };

  completedDocs.forEach((doc) => {
    const cat = doc.metadata?.category?.toLowerCase() || "";
    if (cat in categoryCounts) {
      categoryCounts[cat]++;
    } else {
      categoryCounts["other"] = (categoryCounts["other"] || 0) + 1;
    }
  });

  const activeCategories = Object.entries(categoryCounts).filter(([_, count]) => count > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6" id="workspace-insights-root">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <div>
          <h3 className="font-extrabold text-xs text-slate-800 tracking-wider uppercase font-mono flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-indigo-600 shrink-0" />
            Portfolio Analytics
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Real-time breakdown of achievements</p>
        </div>
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4" id="insights-metrics-grid">
        <div className="bg-slate-50/40 rounded-xl p-4 border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Milestones</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-extrabold text-slate-900">{completedCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">/ {totalCount} total</span>
          </div>
        </div>

        <div className="bg-slate-50/40 rounded-xl p-4 border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Associations</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-extrabold text-indigo-600">{relationshipCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">paths mapped</span>
          </div>
        </div>
      </div>

      {/* Confidence Level progress */}
      {completedCount > 0 && (
        <div className="space-y-2 bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-3" id="insights-confidence">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              Extraction Confidence
            </span>
            <span className="font-mono font-extrabold text-emerald-600">{(averageConfidence * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-emerald-100/40 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(averageConfidence * 100).toFixed(0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Tech Skills List */}
      <div className="space-y-3" id="insights-top-skills">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          Top Verified Competencies
        </h4>

        {sortedTech.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sortedTech.map(([tech, count]) => (
              <span
                key={tech}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60 rounded-lg text-[10px] px-2.5 py-1 font-bold flex items-center gap-2 transition-colors shadow-2xs"
              >
                {tech}
                <span className="bg-slate-100 text-slate-500 text-[8px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center font-mono">
                  {count}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 italic font-medium bg-slate-50/50 p-3 rounded-lg text-center">
            Upload resumes or certificates to populate competency map.
          </p>
        )}
      </div>

      {/* Category distribution horizontal bars */}
      {activeCategories.length > 0 && (
        <div className="space-y-3 pt-2" id="insights-categories">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            Credentials Type Distribution
          </h4>
          <div className="space-y-2.5">
            {activeCategories.map(([cat, count]) => {
              const pct = (count / completedCount) * 100;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold">
                    <span className="capitalize">{cat}</span>
                    <span className="font-mono text-slate-400 font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100/70 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
