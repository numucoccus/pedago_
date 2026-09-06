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
    <div className="space-y-6">
      <PageHeader
        sectionNumber="06 // EVIDENCE REPOSITORY"
        title="Document & Evidence Repository"
        description="Secure faculty repository for syllabi, exam answer sheets, research literature, and class exit slips. Automatically indexed for vector similarity retrieval."
      />

      {/* Upload Zone */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Upload New Course or Research Artifacts
        </h3>
        <DocumentDropzone
          helperText="Upload PDF papers, exam sheets, CSV itemized marks, or TXT exit slips. Automatically encrypted and indexed."
        />
      </div>

      {/* Document Library List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Indexed Documents ({filteredDocs.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Encrypted evidence corpus scoped to active workspace.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter documents..."
              className="w-full text-xs rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 truncate">
                  <p className="font-semibold text-foreground truncate">{doc.title}</p>
                  <p className="text-[0.6875rem] text-muted-foreground font-mono mt-0.5">
                    {formatFileSize(doc.fileSize)} • Indexed {formatDate(doc.createdAt)}
                    {doc.pageCount && ` • ${doc.pageCount} pages`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Indexed
                </span>

                <button
                  onClick={() => toast.info("Document retention protected under workspace audit policy")}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching documents found in repository.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
