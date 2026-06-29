import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, Link, AlertCircle, FileUp, Sparkles, CheckCircle2, Globe } from "lucide-react";

interface DocumentUploadProps {
  onUploadSuccess: (newDoc: any) => void;
}

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [activeSubTab, setActiveSubTab] = useState<"file" | "link">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Link states
  const [urlInput, setUrlInput] = useState("");
  const [isIngestingLink, setIsIngestingLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg("");
    setSuccessMsg("");

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    setSuccessMsg("");
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Upload file to server
  const uploadFile = async (file: File) => {
    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("File is too large. Max size limit is 20MB.");
      return;
    }

    const allowedExtensions = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMsg("Unsupported file format. Please upload PDF, Word DOCX, PNG, or JPG.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload document.");
      }

      setSuccessMsg("Document received! Pathfolio is now analyzing and organizing your skills asynchronously.");
      onUploadSuccess(data.document);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  // Ingest URL link
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsIngestingLink(true);

    try {
      const response = await fetch("/api/ingest-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to ingest URL link.");
      }

      setSuccessMsg("Web Link acquired! Sourcing key achievements, projects, and experiences asynchronously.");
      setUrlInput("");
      onUploadSuccess(data.document);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsIngestingLink(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-5" 
      id="upload-ingest-container"
    >
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 tracking-wide flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
            Ingest Materials
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload resumes, certificates, and portfolio content</p>
        </div>
        
        {/* Sub tabs switcher */}
        <div className="bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40 text-xs self-start sm:self-auto flex">
          <button
            onClick={() => { setActiveSubTab("file"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${
              activeSubTab === "file" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => { setActiveSubTab("link"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${
              activeSubTab === "link" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Web Link
          </button>
        </div>
      </div>

      {/* Message banners */}
      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-rose-700 text-xs flex gap-2 items-start" 
          id="upload-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </motion.div>
      )}
      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-emerald-700 text-xs flex gap-2 items-start" 
          id="upload-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </motion.div>
      )}

      {/* Upload Drag & Drop Area */}
      {activeSubTab === "file" ? (
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          id="file-drop-zone"
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? "border-indigo-600 bg-indigo-50/20"
              : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/30"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            className="hidden"
          />
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">
            {isUploading ? (
              <FileUp className="h-6 w-6 animate-bounce text-indigo-600" />
            ) : (
              <Upload className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600">Click to upload</span>
            <span className="text-xs font-medium text-slate-400"> or drag and drop your file here</span>
          </div>
          <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
            Supports PDF, Word (.docx), Certificates & credentials (PNG/JPG). Max file size 20MB.
          </p>
        </motion.div>
      ) : (
        /* Ingest link form */
        <form onSubmit={handleLinkSubmit} className="space-y-3" id="link-ingest-form">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50 hover:bg-white focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <Globe className="h-4 w-4 text-slate-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://myportfolio-site.com/about"
              className="flex-1 bg-transparent text-xs text-slate-800 outline-hidden placeholder:text-slate-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isIngestingLink || !urlInput}
            id="btn-ingest-link"
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
          >
            {isIngestingLink ? "Ingesting Web Content..." : "Ingest Web Link"}
          </button>
        </form>
      )}
    </motion.div>
  );
}
