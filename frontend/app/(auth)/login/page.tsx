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

      <div className="relative z-10 w-full max-w-md futuristic-card p-8 sm:p-10 shadow-2xl space-y-7 border-primary/30">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-xs mx-auto mb-1">
            P•AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign In to Pedago AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your faculty credentials to access your intelligence workspaces.
          </p>
        </div>

        {/* Quick Demo Login Option */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Instant Evaluation Mode
            </span>
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              PRE-CONFIGURED
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            One-click sign in as Dr. Elena Rostova with complete verified test datasets.
          </p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full mt-1 py-2.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Launch Pre-Loaded Faculty Session</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-xs text-muted-foreground uppercase font-mono tracking-wider">
            Or Sign In with Email
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Institutional Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@university.edu"
                className="w-full text-sm rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-sm rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Sign In with Password</span>}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground pt-1">
          Need a faculty account?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Register Department
          </Link>
        </div>
      </div>
    </div>
  );
}
