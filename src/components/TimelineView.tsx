import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CalendarDays, Sparkles, Award, Code, 
  Calendar, Bookmark, Briefcase, GraduationCap 
} from "lucide-react";

interface TimelineItem {
  id: string;
  title: string;
  category: string;
  issuingOrg: string;
  date: string;
  summary: string;
  technologies: string[];
  createdAt: string;
}

interface YearGroup {
  year: string;
  items: TimelineItem[];
}

interface TimelineViewProps {
  timeline: YearGroup[];
  narrative: string;
}

export default function TimelineView({ timeline, narrative }: TimelineViewProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const getCategoryBadgeColor = (category: string = "") => {
    switch (category.toLowerCase()) {
      case "resume": return "bg-purple-50 text-purple-700 border-purple-200/40";
      case "certificate": return "bg-amber-50 text-amber-700 border-amber-200/40";
      case "project report": return "bg-indigo-50 text-indigo-700 border-indigo-200/40";
      case "internship letter": return "bg-emerald-50 text-emerald-700 border-emerald-200/40";
      case "coursework": return "bg-rose-50 text-rose-700 border-rose-200/40";
      case "portfolio link": return "bg-sky-50 text-sky-700 border-sky-200/40";
      default: return "bg-slate-50 text-slate-700 border-slate-200/40";
    }
  };

  const getCategoryIcon = (category: string = "") => {
    switch (category.toLowerCase()) {
      case "certificate": return Award;
      case "internship letter": return Briefcase;
      case "resume": return GraduationCap;
      default: return Bookmark;
    }
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      return dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8" id="timeline-view-root">
      {/* 1. Verified Career Biography Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-slate-900 rounded-3xl p-8 text-white border border-slate-800 relative overflow-hidden shadow-xl"
      >
        {/* Glow decorations */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/20">
            <Sparkles className="h-4.5 w-4.5 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-[10px] text-indigo-300 tracking-widest uppercase font-mono">
              AI Academic & Career Narrative
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Synthesized and grounded solely on verified credentials</p>
          </div>
        </div>

        {narrative ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm text-slate-100 leading-relaxed font-normal italic pl-4 border-l-2 border-indigo-500"
          >
            "{narrative}"
          </motion.p>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Add completing documents to automatically synthesize and cache your AI digital growth narrative.
          </p>
        )}
      </motion.div>

      {/* 2. Chronological Timeline */}
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-800 tracking-wide">
              Academic & Professional Milestones
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Chronological Pathways</span>
        </div>

        {timeline.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-3xl">
            No events found on your timeline. Please upload documents to see them plotted chronologically.
          </div>
        ) : (
          <div className="space-y-10 relative before:absolute before:inset-0 before:left-4.5 before:w-0.5 before:bg-slate-100/80" id="timeline-nodes-list">
            {timeline.map((group, groupIndex) => (
              <div key={group.year} className="space-y-5" id={`timeline-group-${group.year}`}>
                {/* Year Label node */}
                <div className="flex items-center gap-4 relative z-10">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="h-9.5 w-9.5 rounded-full bg-indigo-600 border-4 border-white text-xs font-bold text-white flex items-center justify-center shadow-md shrink-0 font-mono"
                  >
                    {group.year.slice(-2)}
                  </motion.div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-mono tracking-widest uppercase">
                    Class of {group.year}
                  </h3>
                </div>

                {/* Items in Year */}
                <div className="pl-14 space-y-6">
                  {group.items.map((item, itemIndex) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    const isSelected = selectedItemId === item.id;

                    return (
                      <motion.div 
                        key={item.id} 
                        id={`timeline-item-${item.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-20px" }}
                        transition={{ duration: 0.3, delay: itemIndex * 0.05 }}
                        whileHover={{ y: -1 }}
                        onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                        className={`bg-white hover:bg-slate-50/50 border rounded-2xl p-6 transition-all duration-300 cursor-pointer relative ${
                          isSelected 
                            ? "border-indigo-400 shadow-[0_12px_30px_rgba(99,102,241,0.06)]" 
                            : "border-slate-100/80 hover:border-slate-200/60 shadow-2xs"
                        }`}
                      >
                        {/* Title & Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl shadow-2xs">
                              <CategoryIcon className="h-4 w-4 text-slate-500" />
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                              {item.title}
                            </h4>
                          </div>
                          
                          <span className={`text-[8px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider font-mono ${getCategoryBadgeColor(item.category)}`}>
                            {item.category}
                          </span>
                        </div>

                        {/* Org and Date */}
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-slate-500 font-semibold mt-4">
                          <span className="flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {item.issuingOrg}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {formatFullDate(item.date)}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-xs text-slate-500 leading-relaxed font-normal mt-3.5">
                          {item.summary}
                        </p>

                        {/* Tech Pills */}
                        {item.technologies && item.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100 mt-4">
                            {item.technologies.map((tech, i) => (
                              <span 
                                key={i}
                                className="bg-slate-50 text-slate-600 border border-slate-200/50 rounded-lg text-[9px] px-2 py-0.5 flex items-center gap-1 font-bold"
                              >
                                <Code className="h-2.5 w-2.5 text-indigo-500" />
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
