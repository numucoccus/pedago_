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
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 pb-8 mb-8 border-b border-border/80">
      <div className="space-y-2">
        {sectionNumber && (
          <div className="flex items-center gap-2.5">
            <span className="swiss-header-tag text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-indigo-400 font-bold">
              {sectionNumber}
            </span>
            {badge}
          </div>
        )}
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
          {children}
        </div>
      )}
    </div>
  );
}
