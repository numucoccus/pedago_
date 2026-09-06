"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { formatFileSize, cn } from "@/lib/utils";
import { toast } from "sonner";

export interface UploadedFileItem {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "ready" | "error";
  errorMessage?: string;
}

interface DocumentDropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: Record<string, string[]>;
  className?: string;
  helperText?: string;
}

export function DocumentDropzone({
  onFilesSelected,
  maxFiles = 5,
  acceptedTypes = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "text/csv": [".csv"],
    "text/plain": [".txt"],
  },
  className,
  helperText = "Supports PDF (papers, rubrics), DOCX (syllabi), CSV (student marks), and TXT (exit slips) up to 25MB.",
}: DocumentDropzoneProps) {
  const [fileList, setFileList] = useState<UploadedFileItem[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxFiles,
    accept: acceptedTypes,
    maxSize: 25 * 1024 * 1024,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast.error("Invalid file selection", {
          description: rejectedFiles[0].errors[0]?.message || "File rejected. Ensure size is under 25MB.",
        });
      }

      if (acceptedFiles.length > 0) {
        const newItems: UploadedFileItem[] = acceptedFiles.map((file) => ({
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          file,
          progress: 100,
          status: "ready",
        }));

        setFileList((prev) => [...prev, ...newItems]);
        if (onFilesSelected) {
          onFilesSelected(acceptedFiles);
        }
        toast.success(`Uploaded ${acceptedFiles.length} document(s)`);
      }
    },
  });

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 sm:p-9 text-center transition-all cursor-pointer relative overflow-hidden",
          isDragActive
            ? "border-primary bg-primary/10 glow-primary scale-[1.005]"
            : "border-border/80 hover:border-primary/60 hover:bg-primary/5 bg-background"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mb-3 shadow-xs">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm sm:text-base font-semibold text-foreground">
          {isDragActive ? "Drop academic documents here..." : "Click or drag documents to upload"}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
          {helperText}
        </p>
      </div>

      {fileList.length > 0 && (
        <div className="space-y-2.5">
          {fileList.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background text-sm shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <File className="h-4.5 w-4.5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-foreground truncate">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready
                </span>
                <button
                  onClick={(e) => removeFile(item.id, e)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
