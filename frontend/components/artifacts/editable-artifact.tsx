"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableArtifactProps {
  initialContent: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

export function EditableArtifact({
  initialContent,
  onChange,
  readOnly = false,
  className,
  placeholder = "Edit generated document artifact...",
}: EditableArtifactProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden shadow-xs",
        className
      )}
    >
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground",
              editor.isActive("bold") && "bg-background text-primary font-bold shadow-xs"
            )}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground",
              editor.isActive("italic") && "bg-background text-primary font-bold shadow-xs"
            )}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground",
              editor.isActive("heading", { level: 2 }) && "bg-background text-primary font-bold shadow-xs"
            )}
            title="Heading"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground",
              editor.isActive("bulletList") && "bg-background text-primary font-bold shadow-xs"
            )}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground",
              editor.isActive("orderedList") && "bg-background text-primary font-bold shadow-xs"
            )}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground",
              editor.isActive("blockquote") && "bg-background text-primary font-bold shadow-xs"
            )}
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-background disabled:opacity-40 text-muted-foreground"
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-background disabled:opacity-40 text-muted-foreground"
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="p-5 text-sm leading-relaxed text-foreground min-h-[220px]">
        <EditorContent editor={editor} className="tiptap-content prose dark:prose-invert max-w-none focus:outline-none" />
      </div>
    </div>
  );
}
