"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { AmbientBackground } from "@/components/ambient/ambient-background";
import { supabase } from "@/lib/supabase/client";
import { useDemo } from "@/lib/store/demo-context";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { setIsDemoMode } = useDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        toast.success("Authenticated successfully");
        router.push("/dashboard");
      }
    } catch {
      setErrorMessage("Network error connecting to authentication provider");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setIsDemoMode(true);
    toast.success("Logged in as Dr. Elena Rostova (Demo Faculty)");
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-background">
      <AmbientBackground />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs mx-auto mb-1">
            P•AI
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Sign In to Pedago AI
          </h1>
          <p className="text-xs text-muted-foreground">
            Enter your faculty credentials to access your intelligence workspaces.
          </p>
        </div>

        {/* Quick Demo Login Option */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Instant Evaluation Mode
            </span>
            <span className="text-[0.625rem] uppercase font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              PRE-CONFIGURED
            </span>
          </div>
          <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">
            One-click sign in as Dr. Elena Rostova with complete verified test datasets.
          </p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full mt-1 py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Launch Pre-Loaded Faculty Session</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border/80 w-full" />
          <span className="bg-card px-3 text-[0.6875rem] text-muted-foreground uppercase font-mono tracking-wider">
            Or Sign In with Email
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Institutional Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@university.edu"
                className="w-full text-xs rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-foreground text-background text-xs font-bold hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Sign In with Password</span>}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground pt-1">
          Need a faculty account?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Register Department
          </Link>
        </div>
      </div>
    </div>
  );
}
