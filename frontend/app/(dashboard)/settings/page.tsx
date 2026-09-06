"use client";

import React, { useState } from "react";
import {
  Settings,
  Building2,
  User,
  Sparkles,
  ShieldCheck,
  Globe,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/lib/store/demo-context";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { isDemoMode, setIsDemoMode, user, activeWorkspace, workspaces, setActiveWorkspace } = useDemo();
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:4000/api/v1");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        sectionNumber="07 // SETTINGS & AUDIT"
        title="Workspace & Platform Settings"
        description="Configure faculty institutional credentials, workspace isolation, demo mode simulation, and data privacy policies."
      />

      <form onSubmit={handleSave} className="space-y-8">
        {/* Demo Mode Toggle */}
        <div className="futuristic-card p-7 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                <h3 className="text-base font-bold text-foreground">Interactive Demo Mode</h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                When enabled, uses realistic peer-reviewed synthetic fixtures across all five intelligence workspaces without requiring a running local backend server.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                isDemoMode ? "bg-primary glow-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  isDemoMode ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Faculty Profile */}
        <div className="futuristic-card p-7 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
            <User className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Faculty Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <label className="font-semibold text-foreground">Full Name</label>
              <input
                defaultValue={user.name}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-foreground">Institutional Email</label>
              <input
                defaultValue={user.email}
                disabled
                className="w-full rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5 text-muted-foreground font-mono text-sm"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="font-semibold text-foreground">Department / Division</label>
              <input
                defaultValue={user.department}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium text-sm"
              />
            </div>
          </div>
        </div>

        {/* Workspace Management */}
        <div className="futuristic-card p-7 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
            <Building2 className="h-4.5 w-4.5 text-primary" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Workspace Switching</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Switch active academic department or faculty portfolio scope</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {workspaces.map((ws) => (
                <button
                  type="button"
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws)}
                  className={cn(
                    "p-5 rounded-xl border text-left space-y-2.5 transition-all cursor-pointer",
                    ws.id === activeWorkspace.id
                      ? "border-primary/60 bg-gradient-to-b from-primary/15 via-card to-card ring-1 ring-primary/60 shadow-md glow-primary"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <p className="text-base font-bold text-foreground">{ws.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ws.description}</p>
                  <span className="text-xs font-mono text-primary font-bold uppercase block pt-1">
                    Role: {ws.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Privacy & Ethics Policy */}
        <div className="futuristic-card p-7 sm:p-8 border-emerald-500/30 bg-emerald-500/5 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-foreground">Student Privacy & Telemetry Guardrails</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
            <li>Student PII (Personally Identifiable Information) is automatically masked prior to LLM embedding generation.</li>
            <li>Exit slips are strictly anonymized at ingestion time.</li>
            <li>Letters of Recommendation require explicit manual faculty review and signature.</li>
            <li>No student biometric or exam responses are used for foundation model pretraining.</li>
            <li>Faculty retain complete sovereign control to edit or discard any generated recommendations.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md glow-primary cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
