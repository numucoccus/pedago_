import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  sectionNumber?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({
  sectionNumber,
  title,
  description,
  children,
  badge,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-border/80">
      <div className="space-y-1">
        {sectionNumber && (
          <div className="flex items-center gap-2">
            <span className="swiss-header-tag text-primary">{sectionNumber}</span>
            {badge}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>

      {children && (
        <div className="flex items-center gap-2.5 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
