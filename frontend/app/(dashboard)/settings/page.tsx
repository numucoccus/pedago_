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
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        sectionNumber="07 // SETTINGS & AUDIT"
        title="Workspace & Platform Settings"
        description="Configure faculty institutional credentials, workspace isolation, demo mode simulation, and data privacy policies."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Demo Mode Toggle */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">Interactive Demo Mode</h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                When enabled, uses realistic peer-reviewed synthetic fixtures across all five intelligence workspaces without requiring a running local backend server.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                isDemoMode ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  isDemoMode ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Faculty Profile */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Faculty Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Full Name</label>
              <input
                defaultValue={user.name}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Institutional Email</label>
              <input
                defaultValue={user.email}
                disabled
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-semibold text-foreground">Department / Division</label>
              <input
                defaultValue={user.department}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Workspace Management */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Active Workspace Isolation</h3>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground block">
              Current Active Workspace
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workspaces.map((ws) => (
                <button
                  type="button"
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws)}
                  className={cn(
                    "p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer",
                    ws.id === activeWorkspace.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <p className="text-xs font-bold text-foreground">{ws.name}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">{ws.description}</p>
                  <span className="text-[0.625rem] font-mono text-primary uppercase">
                    Role: {ws.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Privacy & Ethics Policy */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Student Privacy & Telemetry Guardrails</h3>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Student PII (Personally Identifiable Information) is automatically masked prior to LLM embedding generation.</li>
            <li>Exit slips are strictly anonymized at ingestion time.</li>
            <li>No student biometric or exam responses are used for foundation model pretraining.</li>
            <li>Faculty retain complete sovereign control to edit or discard any generated recommendations.</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
