"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 w-full items-center justify-between border-b border-border px-6 lg:px-12 bg-card/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs">
            P•AI
          </div>
          <span>Pedago AI</span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <PageHeader
          sectionNumber="PHILOSOPHY & ETHICS"
          title="Methodology and Academic Principles"
          description="Why Pedago AI is built around strict human judgment and verifiable primary citations."
        />

        <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-4 text-muted-foreground">
          <p className="text-sm font-medium text-foreground">
            In higher education, algorithmic recommendations cannot operate as black boxes. When evaluating student merit, allocating course hours, or committing doctoral lab resources, faculty need traceable evidence, not ungrounded probabilities.
          </p>

          <h3 className="text-sm font-bold text-foreground">Core Invariants:</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>No Autonomous Decisions:</strong> The application assists faculty judgment. It must never present AI output as an automatic final academic decision.
            </li>
            <li>
              <strong>No Unverifiable Quotes:</strong> Student exit slips and exam responses are either directly quoted verbatim or explicitly flagged as aggregated hypotheses. Quotes are never fabricated.
            </li>
            <li>
              <strong>Cautious Academic Language:</strong> For research gap detection, the copilot reports: <em>“No matching work was found in searched sources,”</em> never <em>“Nobody has ever done this.”</em>
            </li>
            <li>
              <strong>Swiss Typographic Restraint:</strong> Visual clarity over decorative excess. Information hierarchy is designed for fast cognitive absorption during intense semester workloads.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
