"use client";

import React, { useState } from "react";
import {
  FolderArchive,
  File,
  UploadCloud,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentDropzone } from "@/components/forms/document-dropzone";
import { useDocuments } from "@/lib/api/endpoints";
import { formatDate, formatFileSize } from "@/lib/utils";
import { toast } from "sonner";

export default function DocumentsPage() {
  const { data: documents = [] } = useDocuments();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="06 // EVIDENCE REPOSITORY"
        title="Document & Evidence Repository"
        description="Secure faculty repository for syllabi, exam answer sheets, research literature, and class exit slips. Automatically indexed for vector similarity retrieval."
      />

      {/* Upload Zone */}
      <div className="futuristic-card p-7 sm:p-8 space-y-5">
        <div className="space-y-1">
          <span className="swiss-header-tag text-primary">INGESTION VAULT</span>
          <h3 className="text-base font-bold text-foreground">
            Upload New Course or Research Artifacts
          </h3>
          <p className="text-xs text-muted-foreground">
            Upload PDF papers, exam sheets, CSV itemized marks, or TXT exit slips. Automatically encrypted and indexed.
          </p>
        </div>
        <DocumentDropzone />
      </div>

      {/* Document Library List */}
      <div className="futuristic-card overflow-hidden">
        <div className="p-6 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="swiss-header-tag text-primary">AUDITED CORPUS</span>
            <h3 className="text-base font-bold text-foreground mt-0.5">
              Indexed Documents ({filteredDocs.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Encrypted evidence corpus scoped to active faculty workspace.
            </p>
          </div>

          <div className="relative max-w-sm w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter documents by title or topic..."
              className="w-full text-xs rounded-xl border border-border/80 bg-background/90 pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 truncate">
                  <p className="font-bold text-foreground truncate text-base">{doc.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatFileSize(doc.fileSize ?? doc.sizeBytes ?? 0)} • Indexed {formatDate(doc.createdAt)}
                    {doc.pageCount && ` • ${doc.pageCount} pages`}
                  </p>

                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Indexed
                </span>

                <button
                  onClick={() => toast.info("Document retention protected under workspace audit policy")}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No matching documents found in repository.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
