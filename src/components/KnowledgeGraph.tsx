import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Network, Zap, Award, Link2, Info, Compass, 
  Sliders, Search, Sparkles, HelpCircle,
  Briefcase, FileText, CheckCircle2, Star, Eye, Layers
} from "lucide-react";
import { DocumentItem, RelationshipEdge } from "../types";

interface KnowledgeGraphProps {
  documents: DocumentItem[];
  relationships: RelationshipEdge[];
}

type LayoutMode = "constellation" | "matrix";

export default function KnowledgeGraph({ documents, relationships }: KnowledgeGraphProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("constellation");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  
  const completedDocs = documents.filter(d => d.status === "completed" && d.metadata);

  if (completedDocs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 max-w-2xl mx-auto shadow-sm" id="graph-empty-state">
        <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 animate-pulse">
          <Network className="h-8 w-8 text-indigo-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No portfolio milestones mapped yet</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          Upload certificates, resumes, or internship letters in the Ingest tab. 
          Our AI pipeline will instantly extract metadata and construct a smart visual connection map.
        </p>
      </div>
    );
  }

  // Width and Height of SVG canvas
  const width = 640;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;

  // Let's create a beautiful concentric radial layout that is fully STATIC (no spinning)
  // We place a beautiful central "CORE PATHWAY" hub, and distribute nodes on outer rings
  const outerRadius = 170;
  const innerRadius = 100;

  const nodePositions = completedDocs.reduce((acc, doc, index) => {
    const total = completedDocs.length;
    // Base static angles to cleanly space nodes without overlapping
    const angle = total === 1 ? 0 : (index / total) * 2 * Math.PI - Math.PI / 2;
    
    // Distribute categories slightly differently for depth
    const isEven = index % 2 === 0;
    const radius = isEven ? outerRadius : innerRadius;

    acc[doc.id] = {
      id: doc.id,
      title: doc.metadata?.title || doc.originalName,
      category: doc.metadata?.category || "Other",
      x: total === 1 ? centerX : centerX + radius * Math.cos(angle),
      y: total === 1 ? centerY : centerY + radius * Math.sin(angle),
      doc
    };
    return acc;
  }, {} as { [id: string]: { id: string; title: string; category: string; x: number; y: number; doc: DocumentItem } });

  const activeNodeId = selectedNodeId || hoveredNodeId;
  const activeEdges = relationships.filter(rel => nodePositions[rel.sourceId] && nodePositions[rel.targetId]);

  // Color mapping based on category
  const getCategoryTheme = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("certificate")) {
      return {
        color: "#f59e0b", // Amber
        bgClass: "bg-amber-50 border-amber-200 text-amber-700",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200/50",
        glowColor: "rgba(245, 158, 11, 0.4)",
        icon: Award
      };
    } else if (cat.includes("project")) {
      return {
        color: "#6366f1", // Indigo
        bgClass: "bg-indigo-50 border-indigo-200 text-indigo-700",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200/50",
        glowColor: "rgba(99, 102, 241, 0.4)",
        icon: Sparkles
      };
    } else if (cat.includes("internship") || cat.includes("letter") || cat.includes("job")) {
      return {
        color: "#10b981", // Emerald
        bgClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200/50",
        glowColor: "rgba(16, 185, 129, 0.4)",
        icon: Briefcase
      };
    } else {
      return {
        color: "#ec4899", // Pink
        bgClass: "bg-pink-50 border-pink-200 text-pink-700",
        badgeColor: "bg-pink-100 text-pink-800 border-pink-200/50",
        glowColor: "rgba(236, 72, 153, 0.4)",
        icon: FileText
      };
    }
  };

  // Node highlighting check
  const isNodeHighlighted = (id: string) => {
    // Search query match
    if (searchQuery.trim()) {
      const node = nodePositions[id];
      const matchText = `${node.title} ${node.category} ${node.doc.metadata?.technologies?.join(" ") || ""}`.toLowerCase();
      if (!matchText.includes(searchQuery.toLowerCase())) return false;
    }

    // Category Filter
    if (selectedCategoryFilter) {
      const node = nodePositions[id];
      if (node.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
    }

    if (!activeNodeId) return true; // Default: show all
    if (activeNodeId === id) return true;

    // Check if connected to active node
    return activeEdges.some(
      edge => (edge.sourceId === activeNodeId && edge.targetId === id) || 
              (edge.targetId === activeNodeId && edge.sourceId === id)
    );
  };

  // Edge highlighting check
  const isEdgeHighlighted = (edge: RelationshipEdge) => {
    if (searchQuery.trim() || selectedCategoryFilter) return false;
    if (!activeNodeId) return true;
    return edge.sourceId === activeNodeId || edge.targetId === activeNodeId;
  };

  const selectedNode = selectedNodeId ? nodePositions[selectedNodeId] : null;
  const selectedNodeEdges = selectedNodeId 
    ? activeEdges.filter(edge => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" id="knowledge-graph-container">
      {/* 1. Main Interactive Visualizer */}
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 relative overflow-hidden min-h-[580px] flex flex-col justify-between" id="visualizer-card">
        {/* Stellar Background Grid decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />
        
        {/* A. Map Controls & Navigation bar */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-400" />
              <h3 className="text-sm font-extrabold text-slate-800 tracking-wide">
                Pathfolio Interactive Connection Map
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Click on nodes to trace skill pathways and credentials instantly</p>
          </div>

          {/* Toggle View Mode & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Filter input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-[9px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Layout switch buttons */}
            <div className="bg-slate-50 p-0.5 rounded-xl border border-slate-200/60 flex text-[10px] font-bold text-slate-500">
              <button
                onClick={() => setLayoutMode("constellation")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === "constellation" ? "bg-indigo-600 text-white shadow-xs" : "hover:text-slate-800"
                }`}
              >
                <Compass className="h-3 w-3" />
                Constellation
              </button>
              <button
                onClick={() => setLayoutMode("matrix")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === "matrix" ? "bg-indigo-600 text-white shadow-xs" : "hover:text-slate-800"
                }`}
              >
                <Sliders className="h-3 w-3" />
                Category Grid
              </button>
            </div>
          </div>
        </div>

        {/* Quick category pill filters on the visualizer */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedCategoryFilter(null)}
            className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              selectedCategoryFilter === null 
                ? "bg-slate-800 text-white border border-slate-700" 
                : "bg-slate-50 text-slate-500 border border-transparent hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            All Types
          </button>
          {Array.from(new Set(completedDocs.map(d => d.metadata?.category).filter(Boolean))).map((cat) => {
            const isSelected = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(isSelected ? null : cat)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-indigo-600 text-white border border-indigo-500" 
                    : "bg-slate-50 text-slate-500 border border-transparent hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* B. Live Canvas Area */}
        <div className="flex-1 flex items-center justify-center relative min-h-[380px] py-4">
          <AnimatePresence mode="wait">
            {layoutMode === "constellation" ? (
              /* --- 1. STATIC CONSTELLATION VIEW (No motion) --- */
              <motion.div
                key="constellation-canvas"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                <svg 
                  viewBox={`0 0 ${width} ${height}`} 
                  className="w-full max-w-[500px] aspect-square overflow-visible"
                  id="stellar-graph-canvas"
                >
                  {/* Static guide circles to anchor the elements beautifully */}
                  <circle cx={centerX} cy={centerY} r={outerRadius} fill="none" stroke="rgba(0,0,0,0.035)" strokeWidth="1" strokeDasharray="6,6" />
                  <circle cx={centerX} cy={centerY} r={innerRadius} fill="none" stroke="rgba(0,0,0,0.025)" strokeWidth="1" />

                  {/* Core Profile hub element in center */}
                  <g transform={`translate(${centerX}, ${centerY})`} className="cursor-default select-none">
                    <circle r="26" fill="#f8fafc" stroke="#4f46e5" strokeWidth="2" />
                    <circle r="36" fill="none" stroke="#4f46e5" strokeWidth="1" strokeDasharray="3,3" className="opacity-30" />
                    <g transform="translate(-8, -8)">
                      <Layers className="h-4 w-4 text-indigo-600" />
                    </g>
                    <text y="48" fontSize="9" fontWeight="800" fill="#4f46e5" textAnchor="middle" className="uppercase tracking-widest font-mono">
                      Core Portfolio
                    </text>
                  </g>

                  {/* Draw Connections with subtle static lines */}
                  {activeEdges.map((edge) => {
                    const source = nodePositions[edge.sourceId];
                    const target = nodePositions[edge.targetId];
                    const isHighlighted = isEdgeHighlighted(edge);
                    const isEmbedding = edge.type === "SEMANTICALLY_RELATED";

                    return (
                      <g key={edge.id}>
                        <motion.line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={isEmbedding ? "#818cf8" : "#34d399"}
                          strokeWidth={isHighlighted ? 2.5 : 0.5}
                          strokeDasharray={isEmbedding ? "none" : "3,4"}
                          opacity={isHighlighted ? 0.9 : 0.12}
                          className="transition-all duration-300"
                        />
                        {/* Interactive glow when highlighted */}
                        {isHighlighted && (
                          <line
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke={isEmbedding ? "#6366f1" : "#10b981"}
                            strokeWidth="6"
                            opacity="0.12"
                            style={{ filter: "blur(3px)" }}
                          />
                        )}
                        {/* Similarity percentage badge */}
                        {isEmbedding && isHighlighted && edge.score && (
                          <g transform={`translate(${(source.x + target.x)/2}, ${(source.y + target.y)/2})`}>
                            <rect 
                              x="-14" 
                              y="-7" 
                              width="28" 
                              height="14" 
                              rx="4" 
                              fill="#f8fafc" 
                              stroke="#c7d2fe" 
                              strokeWidth="1" 
                            />
                            <text 
                              fontSize="7" 
                              fontFamily="monospace"
                              fontWeight="bold"
                              fill="#4f46e5"
                              textAnchor="middle" 
                              dominantBaseline="central"
                            >
                              {(edge.score * 100).toFixed(0)}%
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Draw static category specific nodes */}
                  {Object.values(nodePositions).map((pos) => {
                    const isHighlighted = isNodeHighlighted(pos.id);
                    const isSelected = selectedNodeId === pos.id;
                    const theme = getCategoryTheme(pos.category);
                    const Icon = theme.icon;

                    return (
                      <g
                        key={pos.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer select-none"
                        onMouseEnter={() => setHoveredNodeId(pos.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() => setSelectedNodeId(pos.id === selectedNodeId ? null : pos.id)}
                        opacity={isHighlighted ? 1 : 0.2}
                      >
                        {/* Hover core ring */}
                        <circle
                          r={isSelected ? "22" : "17"}
                          fill="#ffffff"
                          stroke={isHighlighted ? theme.color : "#cbd5e1"}
                          strokeWidth={isSelected ? "3" : "1.5"}
                          style={{ filter: isHighlighted ? `drop-shadow(0 0 8px ${theme.color}40)` : "none" }}
                          className="transition-all duration-300"
                        />

                        {/* Node Icon */}
                        <g transform="translate(-7, -7)">
                          <Icon 
                            style={{ color: isHighlighted ? theme.color : "#94a3b8" }} 
                            className="h-3.5 w-3.5 transition-colors duration-200" 
                          />
                        </g>

                        {/* Label Name tag */}
                        <text
                          y="32"
                          fontSize="8.5"
                          fontWeight={isSelected ? "800" : "600"}
                          fill={isHighlighted ? "#0f172a" : "#64748b"}
                          textAnchor="middle"
                          className="transition-colors duration-200 pointer-events-none"
                        >
                          {pos.title.length > 22 ? `${pos.title.slice(0, 20)}...` : pos.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </motion.div>
            ) : (
              /* --- 2. CATEGORY CLUSTERS MATRIX VIEW --- */
              <motion.div
                key="matrix-canvas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 relative z-10"
              >
                {["Resume", "Certificate", "Project Report", "Internship Letter"].map((categoryGroup) => {
                  const groupDocs = completedDocs.filter(d => 
                    (d.metadata?.category || "Other").toLowerCase().includes(categoryGroup.toLowerCase().split(" ")[0])
                  );

                  if (groupDocs.length === 0) return null;
                  const theme = getCategoryTheme(categoryGroup);
                  const Icon = theme.icon;

                  return (
                    <div 
                      key={categoryGroup}
                      className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3.5">
                          <div className="p-1 rounded-lg" style={{ backgroundColor: `${theme.color}15` }}>
                            <Icon className="h-4 w-4" style={{ color: theme.color }} />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{categoryGroup}s</h4>
                        </div>

                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {groupDocs.map((doc) => {
                            const isSelected = selectedNodeId === doc.id;
                            const isHighlighted = isNodeHighlighted(doc.id);

                            return (
                              <div
                                key={doc.id}
                                onClick={() => setSelectedNodeId(isSelected ? null : doc.id)}
                                onMouseEnter={() => setHoveredNodeId(doc.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                                className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                  isSelected 
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md font-bold" 
                                    : isHighlighted 
                                      ? "bg-white border-slate-200/60 text-slate-700 hover:bg-slate-50" 
                                      : "opacity-30 border-transparent text-slate-400"
                                }`}
                              >
                                <span className="truncate pr-2">
                                  {doc.metadata?.title || doc.originalName}
                                </span>
                                {isSelected ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-200 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100/80 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase font-mono">
                        <span>{groupDocs.length} items</span>
                        <span style={{ color: theme.color }}>{categoryGroup}</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* C. Interactive Help Tip Indicator */}
        <div className="relative z-10 border-t border-slate-100 pt-4 flex items-center justify-between gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>Hover / Click on milestone nodes to highlight semantic routes</span>
          </div>
          <span className="font-mono text-[9px] text-slate-400 font-bold">Stable Constellation v1.2</span>
        </div>
      </div>

      {/* 2. Dynamic Competency Inspector Sidebar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-5" id="inspector-card">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
          <Zap className="h-4.5 w-4.5 text-amber-500 shrink-0" />
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-mono">
            Competency Inspector
          </h3>
        </div>

        {selectedNode ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
              id="inspector-content"
            >
              {/* Category Card Header */}
              <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3.5">
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${getCategoryTheme(selectedNode.category).badgeColor}`}>
                    {selectedNode.category}
                  </span>
                  {selectedNode.doc.metadata?.date && (
                    <span className="text-[9px] text-slate-400 font-extrabold font-mono">
                      {selectedNode.doc.metadata.date}
                    </span>
                  )}
                </div>

                <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                  {selectedNode.title}
                </h4>

                {selectedNode.doc.metadata?.issuingOrg && (
                  <p className="text-[10px] text-slate-500 mt-3 font-semibold flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-indigo-500 shrink-0" />
                    Issued by: {selectedNode.doc.metadata.issuingOrg}
                  </p>
                )}

                {/* Sub-Gauge for Confidence Accuracy */}
                {selectedNode.doc.metadata?.confidence !== undefined && (
                  <div className="mt-4 pt-3.5 border-t border-slate-200/40 flex items-center gap-2.5">
                    {/* Tiny visual circle progress */}
                    <svg className="h-5.5 w-5.5 shrink-0" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500"
                        strokeDasharray={`${selectedNode.doc.metadata.confidence * 100}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                      CONFIDENCE RATE: <span className="text-emerald-600">{(selectedNode.doc.metadata.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Technology Tags capsule array */}
              {selectedNode.doc.metadata?.technologies && selectedNode.doc.metadata.technologies.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 shrink-0" />
                    Mapped Competencies
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.doc.metadata.technologies.map((tech, i) => (
                      <span 
                        key={i} 
                        onClick={() => setSearchQuery(tech)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[9px] px-2.5 py-1 font-bold cursor-pointer transition-colors"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* List of related connections */}
              <div className="space-y-3">
                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Semantic Connections ({selectedNodeEdges.length})
                </h5>

                {selectedNodeEdges.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-center leading-relaxed">
                    No related portfolio connections found. Upload more milestones to trigger semantic correlation index.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedNodeEdges.map((edge) => {
                      const isEmbedding = edge.type === "SEMANTICALLY_RELATED";
                      const otherId = edge.sourceId === selectedNode.id ? edge.targetId : edge.sourceId;
                      const otherNode = nodePositions[otherId];

                      if (!otherNode) return null;

                      return (
                        <div 
                          key={edge.id}
                          onClick={() => setSelectedNodeId(otherNode.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer hover:shadow-2xs transition-all ${
                            isEmbedding 
                              ? "bg-indigo-50/40 hover:bg-indigo-50/80 border-indigo-100" 
                              : "bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                              isEmbedding ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {isEmbedding ? "Semantic Map" : "Grounded"}
                            </span>
                            {edge.score && (
                              <span className="font-mono text-[9px] font-extrabold text-indigo-700">
                                {(edge.score * 100).toFixed(0)}% Match
                              </span>
                            )}
                          </div>
                          
                          <p className="font-extrabold text-slate-800 text-[10px] truncate">
                            {otherNode.title}
                          </p>
                          <p className="text-[10px] text-slate-500 font-normal mt-1 leading-relaxed">
                            {edge.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setSelectedNodeId(null);
                  setSearchQuery("");
                }}
                className="w-full text-center text-[10px] text-indigo-600 hover:text-indigo-800 font-bold border-t border-slate-100 pt-3.5 cursor-pointer"
              >
                Clear Selected Node
              </button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl" id="inspector-placeholder">
            <Info className="h-8 w-8 mx-auto text-slate-300 mb-2.5" />
            <p className="text-[11px] font-extrabold text-slate-600">Select any milestone</p>
            <p className="text-[10px] text-slate-400 mt-2 px-6 leading-relaxed">
              Click on any node in the constellation or grid clusters to inspect technology alignments, extraction metrics, and related insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
